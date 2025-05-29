const express = require('express');
const { readUsers } = require('../models/userModel');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/protected', authenticateToken, (req, res) => {
    const users = readUsers();
    const currentUser = users.find(u => u.id === req.user.id);

    if (!currentUser) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    res.status(200).json({
        message: `Bem-vindo, ${req.user.username}! Esta é uma rota protegida.`,
        yourBalance: currentUser.balance.toFixed(2), // Exibe o saldo do usuário logado
        yourAccountNumber: currentUser.accountNumber
    });
});

// Rota para obter os dados completos do usuário logado
router.get('/user-data', authenticateToken, (req, res) => {
    const users = readUsers();
    const currentUser = users.find(u => u.id === req.user.id);

    if (!currentUser) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Retorna todos os dados do usuário, exceto a senha
    const { password, ...userData } = currentUser; // Remove a senha do objeto
    res.status(200).json({ user: userData });
});

module.exports = router;