const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const userModel = require('../models/userModel');
const { readUsers, writeUsers } = require('../models/userModel');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// Rota de Cadastro
router.post('/register', async (req, res) => {
    const { username, password, fullName, cpf, birthDate } = req.body;

    if (!username || !password || !fullName || !cpf || !birthDate) {
        return res.status(400).json({ message: 'Nome de usuário, senha, nome completo, CPF e data de nascimento são obrigatórios.' });
    }

    const users = readUsers();
    const existingUser = users.find(u => u.username === username);

    if (existingUser) {
        return res.status(409).json({ message: 'Nome de usuário já existe.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: Date.now(), // Usar Date.now() para um ID simples
            username,
            password: hashedPassword,
            fullName,
            cpf,
            birthDate,
            balance: 0.00, // Novo campo: saldo inicial do usuário
            accountNumber: userModel.generateAccountNumber(users) // Novo campo: número da conta
        };
        users.push(newUser);
        writeUsers(users);
        res.status(201).json({
            message: 'Usuário cadastrado com sucesso!',
            userId: newUser.id,
            accountNumber: newUser.accountNumber
        });
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao cadastrar usuário.' });
    }
});

// Rota de Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
    }

    const users = userModel.readUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    try {
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
        res.status(200).json({ message: 'Login realizado com sucesso!', token: token });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao fazer login.' });
    }
});

// Rota de Depósito
router.post('/deposit', authenticateToken, (req, res) => {
    const { amount } = req.body;
    const userId = req.user.id; // Pega o ID do usuário logado

    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: 'Um valor de depósito válido é obrigatório.' });
    }

    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Atualiza o saldo do usuário
    users[userIndex].balance = parseFloat(users[userIndex].balance) + parseFloat(amount);
    writeUsers(users);

    res.status(200).json({
        message: `Depósito de R$${amount.toFixed(2)} realizado com sucesso para ${users[userIndex].username}.`,
        newBalance: users[userIndex].balance.toFixed(2)
    });
});

// Rota de Transferencia
router.post('/transfer', authenticateToken, (req, res) => {
    const { recipientAccountNumber, amount } = req.body;
    const senderId = req.user.id; // ID do usuário que está enviando

    if (!recipientAccountNumber || !amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: 'Número da conta do destinatário e um valor de transferência válido são obrigatórios.' });
    }

    const users = readUsers();
    const senderIndex = users.findIndex(u => u.id === senderId);
    const recipientIndex = users.findIndex(u => u.accountNumber === recipientAccountNumber);

    if (senderIndex === -1) {
        return res.status(404).json({ message: 'Usuário remetente não encontrado.' });
    }

    if (recipientIndex === -1) {
        return res.status(404).json({ message: 'Número da conta do destinatário não encontrado.' });
    }

    if (senderId === users[recipientIndex].id) {
        return res.status(400).json({ message: 'Você não pode transferir para sua própria conta.' });
    }

    const senderBalance = parseFloat(users[senderIndex].balance);
    const transferAmount = parseFloat(amount);

    if (senderBalance < transferAmount) {
        return res.status(400).json({ message: 'Saldo insuficiente para a transferência.' });
    }

    // Realiza a transferência
    users[senderIndex].balance = senderBalance - transferAmount;
    users[recipientIndex].balance = parseFloat(users[recipientIndex].balance) + transferAmount;

    writeUsers(users);

    res.status(200).json({
        message: `Transferência de R$${transferAmount.toFixed(2)} para a conta ${recipientAccountNumber} realizada com sucesso.`,
        yourNewBalance: users[senderIndex].balance.toFixed(2)
    });
});

module.exports = router;