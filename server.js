const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const port = 3004;

const folder = __dirname;
const loginFile = path.join(folder, 'logins.txt');
const petsFile = path.join(folder, 'pets.txt');

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'mysecret',
  resave: false,
  saveUninitialized: false
}));

const header = fs.readFileSync(path.join(__dirname, 'header_footer', 'header.html'), 'utf-8');
const footer = fs.readFileSync(path.join(__dirname, 'header_footer', 'footer.html'), 'utf-8');

const pages = [
  'Home.html',
  'Login.html',
  'Account.html',
  'PetGiveAway.html',
  'Finddogorcat.html',
  'AboutUs.html',
  'Dogcare.html',
  'Catcare.html'
];

function fullPage(filename) {
  const filePath = path.join(folder, filename);
  if (!fs.existsSync(filePath)) return 'File not found!';
  const content = fs.readFileSync(filePath, 'utf-8');
  return header + content + footer;
}

pages.forEach(page => {
  app.get('/' + page, (req, res) => {
    res.send(fullPage(page));
  });
});

app.get('/', (req, res) => {
  res.redirect('/Home.html');
});

app.post('/createAccount', (req, res) => {
  const { username, password } = req.body;
  
  console.log("Received username:", username);
  console.log("Received password:", password);

  const userReg = /^[a-zA-Z0-9]+$/;
  const passReg = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{4,}$/;
  
  console.log("Username regex test:", userReg.test(username));
  console.log("Password regex test:", passReg.test(password));

  if (!userReg.test(username) || !passReg.test(password)) {
    return res.send("Invalid username or password format.");
  }

  let users = [];
  if (fs.existsSync(loginFile)) {
    users = fs.readFileSync(loginFile, 'utf-8').split('\n').filter(line => line.trim() !== '');
  }
  if (users.some(line => line.split(':')[0] === username)) {
    return res.send("Username already exists.");
  }

  fs.appendFileSync(loginFile, `${username}:${password}\n`);

  res.send(`
    <script>
      alert("Account created successfully.");
      window.location.href="/Login.html";
    </script>
  `);
});


app.post('/login', (req, res) => {
  const { username, password } = req.body;
  let users = [];
  if (fs.existsSync(loginFile)) {
    users = fs.readFileSync(loginFile, 'utf-8').split('\n').filter(line => line.trim() !== '');
  }
  const match = users.find(line => line.trim() === `${username}:${password}`);
  
  if (match) {
    req.session.username = username;
    res.send(`
      <script>
         alert("Login successful.");
         window.location.href = "/Login.html";
      </script>
    `);
  } else {
    res.send(`
      <script>
         alert("Invalid username or password.");
         window.location.href = "/Login.html";
      </script>
    `);
  }
});


app.get('/logout', (req, res) => {
  if (!req.session.username) {
    return res.send(`
      <script>
         alert("You are not logged in.");
         window.location.href = "/Home.html";
      </script>
    `);
  }
  
  req.session.destroy(() => {
    res.send(`
      <script>
         alert("Logged out successfully.");
         window.location.href = "/Home.html";
      </script>
    `);
  });
});



app.post('/give-away', (req, res) => {
  if (!req.session.username) {
    return res.send(`
      <script>
         alert("You must be logged in to give away a pet.");
         window.location.href = "/Login.html";
      </script>
    `);
  }

  const { type, breed, age, gender } = req.body;
  let lastID = 0;
  const lines = fs.readFileSync(petsFile, 'utf-8').trim().split('\n').filter(Boolean);

  if (lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    lastID = parseInt(lastLine.split(':')[0]);
  }

  const newID = lastID + 1;
  const entry = `${newID}:${req.session.username}:${type}:${breed}:${age}:${gender}\n`;
  fs.appendFileSync(petsFile, entry);

  res.send(`
    <script>
      alert("Pet registered successfully.");
      window.location.href = "/PetGiveAway.html";
    </script>
  `);
});


app.post('/search-pets', (req, res) => {
  const { type, gender } = req.body;
  const lines = fs.readFileSync(petsFile, 'utf-8').trim().split('\n').filter(Boolean);
  const matches = lines.filter(line => {
    const parts = line.split(':');
    return parts[2] === type && parts[5] === gender;
  });

  if (matches.length === 0) {
    return res.send(`
      <script>
        alert("No matching pets found.");
        window.location.href = "/Finddogorcat.html";
      </script>
    `);
  }
  
  let result = `<div class="allheros">
        <section class="hero">
        <h2>Matching ${gender} ${type}s</h2><ul>`;
  matches.forEach(line => {
    const [id, user, petType, breed, age, petGender] = line.split(':');
    result += `
    
        <li>
      <strong>Breed:</strong> ${breed}<br>
      <strong>Age:</strong> ${age}<br>
      <strong>Gender:</strong> ${petGender}<br>
      <strong>Listed by:</strong> ${user}
    </li><br>
    </section>
    </div>
    `;
  });
  result += '</ul>';
  res.send(header + result + footer);
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
