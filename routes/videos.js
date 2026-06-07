const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const router = express.Router();
const videosFile = './data/videos.json';

// Configuration multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/videos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// Utilitaires
function getVideos() {
  if (!fs.existsSync(videosFile)) {
    fs.writeFileSync(videosFile, JSON.stringify([]));
  }
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

// Uploader une vidéo
router.post('/upload', upload.single('video'), (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { title, description } = req.body;
    if (!title || !req.file) {
      return res.status(400).json({ error: 'Titre et vidéo requis' });
    }

    const newVideo = {
      id: uuidv4(),
      userId: user.userId,
      title,
      description: description || '',
      filename: req.file.filename,
      filepath: `/uploads/${req.file.filename}`,
      thumbnail: null,
      duration: 0,
      views: 0,
      likes: 0,
      dislikes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likedBy: [],
      dislikedBy: [],
      visibility: 'public'
    };

    const videos = getVideos();
    videos.push(newVideo);
    saveVideos(videos);

    res.status(201).json({ 
      message: 'Vidéo uploadée avec succès',
      video: newVideo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir toutes les vidéos
router.get('/', (req, res) => {
  try {
    const videos = getVideos();
    res.json(videos.filter(v => v.visibility === 'public'));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir une vidéo spécifique
router.get('/:id', (req, res) => {
  try {
    const videos = getVideos();
    const video = videos.find(v => v.id === req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: 'Vidéo non trouvée' });
    }

    // Incrémenter les vues
    video.views += 1;
    video.lastViewIP = req.ip;
    saveVideos(videos);

    res.json(video);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Liker/Disliker une vidéo
router.post('/:id/like', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const videos = getVideos();
    const video = videos.find(v => v.id === req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: 'Vidéo non trouvée' });
    }

    const { action } = req.body; // 'like' ou 'dislike'

    if (action === 'like') {
      if (!video.likedBy.includes(user.userId)) {
        video.likedBy.push(user.userId);
        video.likes += 1;
        if (video.dislikedBy.includes(user.userId)) {
          video.dislikedBy = video.dislikedBy.filter(id => id !== user.userId);
          video.dislikes -= 1;
        }
      }
    } else if (action === 'dislike') {
      if (!video.dislikedBy.includes(user.userId)) {
        video.dislikedBy.push(user.userId);
        video.dislikes += 1;
        if (video.likedBy.includes(user.userId)) {
          video.likedBy = video.likedBy.filter(id => id !== user.userId);
          video.likes -= 1;
        }
      }
    }

    saveVideos(videos);
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir les vidéos d'un utilisateur
router.get('/user/:userId', (req, res) => {
  try {
    const videos = getVideos();
    const userVideos = videos.filter(v => v.userId === req.params.userId);
    res.json(userVideos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
