// Animal Kingdom Gallery
// Ibrahim Abdullah
// George Tsang
// WEB322
// iabdullah1@myseneca.ca

const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const lineReader = require('linebyline');
const sessions = require('client-sessions');
const fs = require('fs');

const app = express();
app.engine('hbs', engine({ defaultLayout: 'main', extname: '.hbs' }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(sessions({
  cookieName: 'session',
  secret: 'this_is_a_secret_string', // Replace with a strong, secret key.
  duration: 30 * 60 * 1000, // 30 minutes
  activeDuration: 5 * 60 * 1000,
  httpOnly: true,
  secure: true,
  ephemeral: true
}));

// Helper function to read images from file
function getImages(callback) {
  let images = [];
  const lr = lineReader(path.join(__dirname, 'imagelist.txt'));
  lr.on('line', (line) => {
    if (line.trim() !== 'Lion.jpg') {
      images.push({ name: line.split('.')[0], filename: line });
    }
  });
  lr.on('end', () => {
    callback(images);
  });
}

// GET route for the login page
app.get('/login', (req, res) => {
  res.render('login');
});

// POST route for login form submission
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Logic to read users.json and verify credentials
    fs.readFile(path.join(__dirname, 'users.json'), 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading user credentials:', err);
        return res.status(500).send('Error reading user credentials');
      }
      const users = JSON.parse(data);
      const userPassword = users[username];
      if (userPassword) {
        if (userPassword === password) {
          // Correct credentials, set the session
          req.session.userId = username;
          res.redirect('/');
        } else {
          // Incorrect password, send an error message
          res.render('login', { errorMessage: 'Invalid password' });
        }
      } else {
        // Incorrect username, send an error message
        res.render('login', { errorMessage: 'Not a registered username' });
      }
    });
  });
// Logout route
app.get('/logout', (req, res) => {
    req.session.reset(); // This clears the session
    res.clearCookie('session'); // This clears the cookie that holds session info
    res.redirect('/login');
  });

// Ensure gallery page requires login
app.get('/', (req, res) => {
  if (req.session.userId) {
    getImages((images) => {
      res.render('gallery', { images, defaultImage: 'Lion', user: req.session.userId });
    });
  } else {
    res.redirect('/login');
  }
});

// POST route to handle image selection
app.post('/display', (req, res) => {
  if (req.session.userId) {
    const selectedImage = req.body.image || 'Lion.jpg';
    getImages((images) => {
      res.render('gallery', { images, selectedImage, user: req.session.userId });
    });
  } else {
    res.redirect('/login');
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
