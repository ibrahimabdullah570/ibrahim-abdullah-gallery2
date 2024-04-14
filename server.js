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


app.engine('hbs', engine({
  defaultLayout: 'main',
  extname: '.hbs',
  helpers: {
    eq: (v1, v2) => v1 === v2
  }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
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
  fs.readFile(path.join(__dirname, 'imagelist.txt'), 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading image list:', err);
      return callback(err, null);
    }
    let images = data.trim().split('\n').map(line => {
      let [filename, description, price, status] = line.split(',');
      // Trim the values to remove any whitespace
      return {
        filename: filename.trim(),
        description: description.trim(),
        price: parseInt(price.trim(), 10),
        status: status.trim()
      };
    });
    callback(null, images);
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
  getImages((err, images) => {
    if (err) {
      console.error('Error retrieving images for reset:', err);
      return res.status(500).send('Failed to reset images');
    }
    images.forEach(img => img.status = 'A');  // Reset status to 'A'
    writeImages(images, (writeErr) => {
      if (writeErr) {
        console.error('Error writing reset image list:', writeErr);
        return res.status(500).send('Failed to write reset images');
      }
      req.session.reset();
      res.clearCookie('session');
      res.redirect('/login');
    });
  });
});


app.get('/', (req, res) => {
  if (req.session.userId) {
    getImages((err, images) => {
      if (err) {
        return res.status(500).send('Error retrieving images');
      }
      // Pass all images to the view, not just available ones
      res.render('gallery', { images: images, user: req.session.userId });
    });
  } else {
    res.redirect('/login');
  }
});

      // Route for displaying the order page
app.get('/order/:filename', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  const filename = req.params.filename;
  getImages((err, images) => {
    if (err) {
      return res.status(500).send('Error retrieving images');
    }
    const image = images.find(img => img.filename === filename && img.status === 'A');
    if (image) {
      res.render('order', { image });
    } else {
      res.status(404).send('Image not found or not available');
    }
  });
});

// Route for handling the purchase
app.post('/purchase', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  const filename = req.body.filename;
  getImages((err, images) => {
    if (err) {
      return res.status(500).send('Error retrieving images');
    }
    const imageIndex = images.findIndex(img => img.filename === filename && img.status === 'A');
    if (imageIndex !== -1) {
      images[imageIndex].status = 'S'; // Set status to Sold
      writeImages(images, (writeErr) => {
        if (writeErr) {
          return res.status(500).send('Error updating image status');
        }
        res.redirect('/'); // Redirect to the gallery page after purchase
      });
    } else {
      res.status(404).send('Image not found or already sold');
    }
  });
});

// ...

// Helper function to write images to file
function writeImages(images, callback) {
  const data = images.map(image => `${image.filename},${image.description},${image.price},${image.status}`).join('\n');
  fs.writeFile(path.join(__dirname, 'imagelist.txt'), data, 'utf8', (err) => {
    if (err) {
      console.error('Error writing image list:', err);
      return callback(err);
    }
    callback(null);
  });
}

app.post('/display', (req, res) => {
  if (req.session.userId) {
    const selectedImage = req.body.image; // From dropdown
    getImages((err, images) => {
      if (err) {
        console.error('Error retrieving images:', err);
        return res.status(500).send('Error retrieving images');
      }
      res.render('gallery', { images: images, selectedImage, user: req.session.userId });
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