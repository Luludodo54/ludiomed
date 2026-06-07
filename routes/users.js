const express = require('express');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const usersFile = './data/users.json';

function getUsers() {
  if (!fs.existsSync(usersFile)) return [];
  return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
}

function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function getUserFromToken(req) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return null;
  }
}

// Obtenir le profil de l'utilisateur
router.get('/me', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const users = getUsers();
    const currentUser = users.find(u => u.id === user.userId);

    if (!currentUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({
      id: currentUser.id,
      username: currentUser.username,
      email: currentUser.email,
      role: currentUser.role,
      verified: currentUser.verified,
      createdAt: currentUser.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir le profil public d'un utilisateur
router.get('/:userId', (req, res) => {
  try {
    const users = getUsers();
    const user = users.find(u => u.id === req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({
      id: user.id,
      username: user.username,
      verified: user.verified,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mettre à jour le profil
router.put('/me', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { username, bio } = req.body;
    const users = getUsers();
    const currentUser = users.find(u => u.id === user.userId);

    if (!currentUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (username) currentUser.username = username;
    if (bio) currentUser.bio = bio;

    saveUsers(users);
    res.json({ message: 'Profil mis à jour', user: currentUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
