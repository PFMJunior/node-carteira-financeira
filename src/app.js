require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const protectedRoutes = require('./routes/protectedRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Usando as rotas separadas
app.use('/api/auth', authRoutes); // Ex: /api/auth/register, /api/auth/login
app.use('/api', protectedRoutes); // Ex: /api/protected

app.listen(PORT, () => {
    console.log(`Servidor backend rodando em http://localhost:${PORT}`);
});