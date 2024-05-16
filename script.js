document.addEventListener('DOMContentLoaded', (event) => {
  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyBe-bWNvD8oTHZ7K6XATeNqB5o5tTcpC_0",
    authDomain: "changing-tides-2e060.firebaseapp.com",
    databaseURL: "https://changing-tides-2e060-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "changing-tides-2e060",
    storageBucket: "changing-tides-2e060.appspot.com",
    messagingSenderId: "6059265616",
    appId: "1:6059265616:web:fdc6b2620de3eb860e0b55",
    measurementId: "G-3V0P770K0D"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();

  let username = localStorage.getItem('username');
  let selectedBlock = null;
  let pairs = 0;
  let highscore = parseInt(localStorage.getItem('highscore')) || 0;
  let roundWins = 0;
  let timeLeft = 30;  // Verfügbare Zeit halbiert
  let difficulty = 1;
  let timerStarted = false;
  const usernameContainer = document.getElementById('username-container');
  const usernameInput = document.getElementById('username-input');
  const startButton = document.getElementById('start-button');
  const explanationText = document.getElementById('explanation-text');
  const timerElement = document.getElementById('timer');
  const highscoreElement = document.getElementById('highscore');
  const roundWinsElement = document.getElementById('round-wins');
  const highscoreListElement = document.getElementById('highscore-list');
  const leftColumn = document.getElementById('left-column');
  const rightColumn = document.getElementById('right-column');
  const gameBoard = document.getElementById('game-board');
  let timerInterval;

  highscoreElement.innerText = `Highscore: ${highscore}`;
  roundWinsElement.innerText = `Runden: ${roundWins}`;

  if (username) {
    usernameContainer.style.display = 'none';
    if (localStorage.getItem('hideExplanation') !== 'true') {
      explanationText.style.display = 'block';
    } else {
      explanationText.style.display = 'none';
    }
    loadProgress(username).then((progress) => {
      roundWins = progress.roundWins;
      difficulty = progress.difficulty;
      roundWinsElement.innerText = `Runden: ${roundWins}`;
      showGame();
    });
  } else {
    usernameContainer.style.display = 'flex';
    explanationText.style.display = 'none';
  }

  startButton.addEventListener('click', () => {
    username = usernameInput.value.trim();
    if (username) {
      checkUsernameAvailability(username)
        .then(isAvailable => {
          if (isAvailable) {
            localStorage.setItem('username', username);
            saveUsername(username);
            usernameContainer.style.display = 'none';
            explanationText.style.display = 'block';
            loadProgress(username).then((progress) => {
              roundWins = progress.roundWins;
              difficulty = progress.difficulty;
              roundWinsElement.innerText = `Runden: ${roundWins}`;
              showGame();
            });
          } else {
            alert('Dieser Benutzername ist bereits vergeben. Bitte wähle einen anderen Namen.');
          }
        });
    }
  });

  function showGame() {
    gameBoard.style.display = 'flex';
    timerElement.style.display = 'block';
    highscoreElement.style.display = 'block';
    roundWinsElement.style.display = 'block';
    highscoreListElement.style.display = 'block';
    setupGame();
    loadHighscores();
  }

  function generateRandomColorLab(baseLab, variation) {
    const randomOffset = () => (Math.random() - 0.5) * variation;
    const L = Math.min(100, Math.max(0, baseLab[0] + randomOffset()));
    const a = Math.min(128, Math.max(-128, baseLab[1] + randomOffset()));
    const b = Math.min(128, Math.max(-128, baseLab[2] + randomOffset()));
    return [L, a, b];
  }

  function labToRgb(lab) {
    let y = (lab[0] + 16) / 116;
    let x = lab[1] / 500 + y;
    let z = y - lab[2] / 200;
    [x, y, z] = [x, y, z].map(v => {
      let p = Math.pow(v, 3);
      return p > 0.008856 ? p : (v - 16 / 116) / 7.787;
    });
    x *= 95.047;
    y *= 100;
    z *= 108.883;
    [x, y, z] = [x, y, z].map(v => v / 100);
    let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    let b = x * 0.0557 + y * -0.2040 + z * 1.0570;
    [r, g, b] = [r, g, b].map(v => {
      return v > 0.0031308 ? 1.055 * Math.pow(v, 1 / 2.4) - 0.055 : v * 12.92;
    });
    [r, g, b] = [r, g, b].map(v => Math.min(255, Math.max(0, Math.round(v * 255))));
    return `rgb(${r}, ${g}, ${b})`;
  }

  function generateColors() {
    const baseLab = [70, 20, 20];
    const variation = Math.floor(100 / difficulty);  // Schwierigkeit langsamer erhöhen
    const colors = [];
    for (let i = 0; i < 6; i++) {
      const colorLab = generateRandomColorLab(baseLab, variation);
      colors.push(labToRgb(colorLab));
    }
    return colors;
  }

  function setupGame() {
    const colors = generateColors();
    const shuffledColors = [...colors].sort(() => Math.random() - 0.5);
    leftColumn.innerHTML = '';
    rightColumn.innerHTML = '';
    colors.forEach((color, index) => {
      const leftBlock = document.createElement('div');
      leftBlock.className = 'color-block';
      leftBlock.style.backgroundColor = color;
      leftBlock.dataset.color = index;

      const rightBlock = document.createElement('div');
      rightBlock.className = 'color-block';
      rightBlock.style.backgroundColor = shuffledColors[index];
      rightBlock.dataset.color = colors.indexOf(shuffledColors[index]);

      leftColumn.appendChild(leftBlock);
      rightColumn.appendChild(rightBlock);

      leftBlock.addEventListener('click', handleBlockClick);
      rightBlock.addEventListener('click', handleBlockClick);
    });
    realignBlocks(leftColumn);
    realignBlocks(rightColumn);
  }

  function handleBlockClick(event) {
    if (!timerStarted) {
      startTimer();
      timerStarted = true;
    }
    const block = event.target;
    if (selectedBlock) {
      if (selectedBlock.dataset.color === block.dataset.color && selectedBlock !== block) {
        const tempSelectedBlock = selectedBlock;
        const tempBlock = block;
        selectedBlock.style.border = '2px solid green';
        block.style.border = '2px solid green';
        pairs++;
        setTimeout(() => {
          if (tempSelectedBlock && tempSelectedBlock.parentNode) {
            tempSelectedBlock.parentNode.removeChild(tempSelectedBlock);
          }
        }, 500);
        setTimeout(() => {
          if (tempBlock && tempBlock.parentNode) {
            tempBlock.parentNode.removeChild(tempBlock);
          }
          realignBlocks(leftColumn);
          realignBlocks(rightColumn);
        }, 500);
        if (pairs === 6) {
          clearInterval(timerInterval);
          roundWins++;
          roundWinsElement.innerText = `Runden: ${roundWins}`;
          updateProgress(username, roundWins, difficulty + 0.2);  // Schwierigkeit leicht erhöhen
          if (roundWins > highscore) {
            highscore = roundWins;
            localStorage.setItem('highscore', highscore);
            highscoreElement.innerText = `Highscore: ${highscore}`;
            updateHighscore(username, highscore);
          }
          difficulty = Math.min(difficulty + 0.2, 10);  // Schwierigkeit leicht erhöhen
          if (roundWins >= 2) {
            explanationText.style.display = 'none';
            localStorage.setItem('hideExplanation', 'true');
          }
          resetGame();
        }
      } else {
        // Falsch verbunden, Fortschritt zurücksetzen
        selectedBlock.style.border = '';
        block.style.border = '';
        roundWins = 0;
        roundWinsElement.innerText = `Runden: ${roundWins}`;
        difficulty = 1;
        updateProgress(username, roundWins, difficulty);
        resetGame();
      }
      selectedBlock = null;
    } else {
      selectedBlock = block;
      block.style.border = '4px solid blue';  // Deutlichere Hervorhebung
    }
  }

  function realignBlocks(column) {
    const blocks = Array.from(column.children);
    blocks.forEach((block, index) => {
      block.style.order = index;
      block.classList.add('moving');
      block.style.top = `${index * 11}rem`; // Adjust according to block height and gap
    });
    setTimeout(() => {
      blocks.forEach(block => block.classList.remove('moving'));
    }, 500);
  }

  function startTimer() {
    timerInterval = setInterval(() => {
      timeLeft--;
      timerElement.innerText = `Zeit: ${timeLeft}`;
      if (timeLeft === 0) {
        clearInterval(timerInterval);
        roundWins = 0;
        roundWinsElement.innerText = `Runden: ${roundWins}`;
        difficulty = 1;
        updateProgress(username, roundWins, difficulty);
        resetGame();
      }
    }, 1000);
  }

  function resetGame() {
    pairs = 0;
    timeLeft = 30;  // Verfügbare Zeit halbiert
    timerElement.innerText = `Zeit: ${timeLeft}`;
    setupGame();
    timerStarted = false;
    clearInterval(timerInterval);
  }

  function updateHighscore(username, score) {
    const userRef = firebase.database().ref('highscores/' + username);
    userRef.once('value', (snapshot) => {
      if (snapshot.exists()) {
        const existingScore = snapshot.val().score;
        if (score > existingScore) {
          userRef.update({ score: score });
        }
      } else {
        userRef.set({ username: username, score: score });
      }
      loadHighscores();
    });
  }

  function loadHighscores() {
    firebase.database().ref('highscores').orderByChild('score').limitToLast(10).once('value', (snapshot) => {
      highscoreListElement.innerHTML = '<h3>Top Highscores:</h3>';
      const highscores = [];
      snapshot.forEach((childSnapshot) => {
        highscores.push(childSnapshot.val());
      });
      highscores.reverse(); // Um die Reihenfolge von hoch nach niedrig zu sortieren
      highscores.forEach((highscoreData) => {
        highscoreListElement.innerHTML += `<div>${highscoreData.username}: ${highscoreData.score}</div>`;
      });
    });
  }

  function checkUsernameAvailability(username) {
    return firebase.database().ref('usernames/' + username).once('value')
      .then(snapshot => !snapshot.exists());
  }

  function saveUsername(username) {
    firebase.database().ref('usernames/' + username).set(true);
  }

  function loadProgress(username) {
    return firebase.database().ref('progress/' + username).once('value')
      .then(snapshot => snapshot.exists() ? snapshot.val() : { roundWins: 0, difficulty: 1 });
  }

  function updateProgress(username, roundWins, difficulty) {
    firebase.database().ref('progress/' + username).set({ roundWins: roundWins, difficulty: difficulty });
  }

  window.onload = () => {
    if (username) {
      loadProgress(username).then((progress) => {
        roundWins = progress.roundWins;
        difficulty = progress.difficulty;
        roundWinsElement.innerText = `Runden: ${roundWins}`;
        showGame();
      });
    }
  };
});
