const express = require('express');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const usersFile = './data/users.json';
const videosFile = './data/videos.json';

function getUsers() {
  if (!fs.existsSync(usersFile)) return [];
  return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
}

function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function getVideos() {
  if (!fs.existsSync(videosFile)) return [];
  return JSON.parse(fs.readFileSync(videosFile, 'utf-8'));
}

function saveVideos(videos) {
  fs.writeFileSync(videosFile, JSON.stringify(videos, null, 2));
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

function isAdmin(user) {
  const users = getUsers();
  const currentUser = users.find(u => u.id === user.userId);
  return currentUser && currentUser.role === 'admin';
}

// Vérifier si admin
router.get('/check', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    res.json({ isAdmin: isAdmin(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lister tous les utilisateurs
router.get('/users', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user || !isAdmin(user)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const users = getUsers();
    res.json(users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      verified: u.verified,
      createdAt: u.createdAt
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Certifier un utilisateur
router.post('/verify-user/:userId', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user || !isAdmin(user)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const users = getUsers();
    const targetUser = users.find(u => u.id === req.params.userId);

    if (!targetUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    targetUser.verified = true;
    saveUsers(users);

    res.json({ message: 'Utilisateur certifié', user: targetUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bannir un utilisateur
router.post('/ban-user/:userId', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user || !isAdmin(user)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const users = getUsers();
    const videos = getVideos();
    const targetUser = users.find(u => u.id === req.params.userId);

    if (!targetUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    targetUser.banned = true;
    targetUser.role = 'banned';
    saveUsers(users);

    // Supprimer les vidéos de l'utilisateur banni
    const updatedVideos = videos.filter(v => v.userId !== req.params.userId);
    saveVideos(updatedVideos);

    res.json({ message: 'Utilisateur banni', user: targetUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Débannir un utilisateur
router.post('/unban-user/:userId', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user || !isAdmin(user)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const users = getUsers();
    const targetUser = users.find(u => u.id === req.params.userId);

    if (!targetUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    targetUser.banned = false;
    targetUser.role = 'user';
    saveUsers(users);

    res.json({ message: 'Utilisateur débanni', user: targetUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lister toutes les vidéos
router.get('/videos', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user || !isAdmin(user)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const videos = getVideos();
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supprimer une vidéo (modération)
router.delete('/video/:videoId', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user || !isAdmin(user)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const videos = getVideos();
    const updatedVideos = videos.filter(v => v.id !== req.params.videoId);
    saveVideos(updatedVideos);

    res.json({ message: 'Vidéo supprimée' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
