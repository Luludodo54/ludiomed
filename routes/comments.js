const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const router = express.Router();
const commentsFile = './data/comments.json';

// Utilitaires
function getComments() {
  if (!fs.existsSync(commentsFile)) {
    fs.writeFileSync(commentsFile, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(commentsFile, 'utf-8'));
}

function saveComments(comments) {
  fs.writeFileSync(commentsFile, JSON.stringify(comments, null, 2));
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

// Ajouter un commentaire
router.post('/:videoId', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Texte du commentaire requis' });
    }

    const newComment = {
      id: uuidv4(),
      videoId: req.params.videoId,
      userId: user.userId,
      text,
      likes: 0,
      createdAt: new Date().toISOString()
    };

    const comments = getComments();
    comments.push(newComment);
    saveComments(comments);

    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir les commentaires d'une vidéo
router.get('/:videoId', (req, res) => {
  try {
    const comments = getComments();
    const videoComments = comments.filter(c => c.videoId === req.params.videoId);
    res.json(videoComments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supprimer un commentaire
router.delete('/:commentId', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const comments = getComments();
    const comment = comments.find(c => c.id === req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Commentaire non trouvé' });
    }

    if (comment.userId !== user.userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const updatedComments = comments.filter(c => c.id !== req.params.commentId);
    saveComments(updatedComments);

    res.json({ message: 'Commentaire supprimé' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
