const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// Exemplo de rota protegida (requer autenticação)
router.get('/protected', authenticateToken, (req, res) => {
    res.status(200).json({ message: `Bem-vindo, ${req.user.username}! Esta é uma rota protegida.` });
});

module.exports = router;