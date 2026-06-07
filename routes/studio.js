const express = require('express');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const videosFile = './data/videos.json';
const commentsFile = './data/comments.json';
const usersFile = './data/users.json';

function getUserFromToken(req) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return null;
  }
}

function getVideos() {
  if (!fs.existsSync(videosFile)) return [];
  return JSON.parse(fs.readFileSync(videosFile, 'utf-8'));
}

function getComments() {
  if (!fs.existsSync(commentsFile)) return [];
  return JSON.parse(fs.readFileSync(commentsFile, 'utf-8'));
}

function getUsers() {
  if (!fs.existsSync(usersFile)) return [];
  return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
}

// Obtenir le dashboard du studio
router.get('/dashboard', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const videos = getVideos().filter(v => v.userId === user.userId);
    const comments = getComments();
    const users = getUsers();

    const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
    const totalLikes = videos.reduce((sum, v) => sum + v.likes, 0);
    const totalDislikes = videos.reduce((sum, v) => sum + v.dislikes, 0);
    const totalComments = comments.filter(c => {
      return videos.some(v => v.id === c.videoId);
    }).length;

    // Analyser les IPs et géolocalisation (simplifié)
    const viewsByIP = {};
    videos.forEach(video => {
      if (video.lastViewIP) {
        viewsByIP[video.lastViewIP] = (viewsByIP[video.lastViewIP] || 0) + 1;
      }
    });

    res.json({
      stats: {
        totalVideos: videos.length,
        totalViews,
        totalLikes,
        totalDislikes,
        totalComments,
        averageViews: videos.length > 0 ? Math.round(totalViews / videos.length) : 0
      },
      videos,
      viewsByIP,
      topVideos: videos.sort((a, b) => b.views - a.views).slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistiques détaillées par vidéo
router.get('/video/:videoId/stats', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const videos = getVideos();
    const video = videos.find(v => v.id === req.params.videoId && v.userId === user.userId);

    if (!video) {
      return res.status(404).json({ error: 'Vidéo non trouvée' });
    }

    const comments = getComments().filter(c => c.videoId === video.id);
    const engagementRate = video.views > 0 
      ? Math.round(((video.likes + video.dislikes + comments.length) / video.views) * 100) 
      : 0;

    res.json({
      video,
      stats: {
        views: video.views,
        likes: video.likes,
        dislikes: video.dislikes,
        comments: comments.length,
        engagementRate: engagementRate + '%',
        likeRatio: video.views > 0 ? Math.round((video.likes / video.views) * 100) : 0
      },
      comments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analyser les utilisateurs qui regardent
router.get('/viewers/:videoId', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const videos = getVideos();
    const video = videos.find(v => v.id === req.params.videoId && v.userId === user.userId);

    if (!video) {
      return res.status(404).json({ error: 'Vidéo non trouvée' });
    }

    res.json({
      videoTitle: video.title,
      totalViewers: video.views,
      ipAddresses: [video.lastViewIP || 'N/A'],
      lastViewed: video.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
