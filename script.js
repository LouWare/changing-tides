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

  function generateRandomColor(baseColor, variation) {
    const base = parseInt(baseColor.slice(1), 16);
    const r = Math.min(255, Math.max(0, (base >> 16) + Math.floor((Math.random() - 0.5) * variation)));
    const g = Math.min(255, Math.max(0, ((base >> 8) & 0xFF) + Math.floor((Math.random() - 0.5) * variation)));
    const b = Math.min(255, Math.max(0, (base & 0xFF) + Math.floor((Math.random() - 0.5) * variation)));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  function generateColors() {
    const baseColor = '#FFCCCC';
    const variation = Math.floor(150 / difficulty);
    const colors = [];
    for (let i = 0; i < 6; i++) {
      colors.push(generateRandomColor(baseColor, variation));
    }
    return colors;
  }

  function setupGame() {
    console.log('Setting up game...');
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
