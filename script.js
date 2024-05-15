document.addEventListener('DOMContentLoaded', (event) => {
  console.log('DOM fully loaded and parsed');

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
  let timeLeft = 60;
  let difficulty = 1;
  let timerStarted = false;
  const usernameContainer = document.getElementById('username-container');
  const usernameInput = document.getElementById('username-input');
  const startButton = document.getElementById('start-button');
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
    loadProgress(username).then((progress) => {
      roundWins = progress.roundWins;
      difficulty = progress.difficulty;
      roundWinsElement.innerText = `Runden: ${roundWins}`;
      showGame();
    });
  } else {
    usernameContainer.style.display = 'flex';
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

  function labToRgb(l, a, b) {
    let y = (l + 16) / 116;
    let x = a / 500 + y;
    let z = y - b / 200;
    const r = Math.round(255 * (x > 0.008856 ? x * x * x : (x - 16 / 116) / 7.787));
    const g = Math.round(255 * (y > 0.008856 ? y * y * y : (y - 16 / 116) / 7.787));
    const bComp = Math.round(255 * (z > 0.008856 ? z * z * z : (z - 16 / 116) / 7.787));
    return `rgb(${r}, ${g}, ${bComp})`;
  }

  function rgbToLab(rgb) {
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;

    const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
    const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

    const lab = [
      116 * (y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116)) - 16,
      500 * ((x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116)) - (y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116))),
      200 * ((y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116)) - (z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116)))
    ];
    return lab;
  }

  function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
  }

  function generateLABColors(baseColor, steps, variation) {
    const baseRgb = hexToRgb(baseColor);
    const baseLab = rgbToLab(baseRgb);

    const colors = [baseColor];
    for (let i = 1; i < steps; i++) {
      const newL = baseLab[0] - (i * variation);
      const newColor = labToRgb(newL, baseLab[1], baseLab[2]);
      colors.push(newColor);
    }
    return colors;
  }

  function setupGame() {
    console.log('Setting up game...');
    const baseColor = "#3498db";
    const colors = generateLABColors(baseColor, 6, difficulty * 1.5); // Increase the variation factor as the difficulty increases
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
  }

  function handleBlockClick(event) {
    if (!timerStarted) {
      startTimer();
      timerStarted = true;
    }
    const block = event.target;
    if (selectedBlock) {
      if (selectedBlock.dataset.color === block.dataset.color && selectedBlock !== block) {
        selectedBlock.style.border = '2px solid green';
        block.style.border = '2px solid green';
        pairs++;
        block.removeEventListener('click', handleBlockClick);
        selectedBlock.removeEventListener('click', handleBlockClick);
        if (pairs === 6) {
          clearInterval(timerInterval);
          roundWins++;
          roundWinsElement.innerText = `Runden: ${roundWins}`;
          updateProgress(username, roundWins, difficulty + 0.5);
          if (roundWins > highscore) {
            highscore = roundWins;
            localStorage.setItem('highscore', highscore);
            highscoreElement.innerText = `Highscore: ${highscore}`;
            updateHighscore(username, highscore);
          }
          difficulty = Math.min(difficulty + 0.5, 10);  // Schwierigkeit langsamer erhöhen
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
      block.style.border = '2px solid blue';
    }
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
    timeLeft = 60;
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
