const express = require('express');
const cors = require('cors');
const CustomError = require('./utils/CustomError');
const globalErrorHandler = require('./controllers/errorController');
const helmet = require('helmet');
const sanitize = require('express-mongo-sanitize');
const xss = require("xss");
const hpp = require('hpp');
const cookieParser = require("cookie-parser");

//Rodar schedules
require('./utils/schedules');

let app = express();

app.set('trust proxy', 1);
app.get('/ip', (request, response) => response.send(request.ip));

app.use(helmet());
app.use(cookieParser());

//limita algo enviado pelo usuario para 10kb 
app.use(express.json({ limit: '10kb' }));

app.use(sanitize());

app.use(hpp());

let corsOptions = {
    origin: ['http://localhost:5172', 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}

app.use(cors(corsOptions));

// Middlware que roda sempre antes de toda as middlewares de api.
app.use((request, response, next) => {
    request.requestedAt = new Date().toISOString();

    try {
        // Sanitiza request.body
        if (request.body) {
            for (const key in request.body) {
                if (typeof request.body[key] === "string") {
                    request.body[key] = xss(request.body[key]);
                }
            }
        }

        // Sanitiza request.query
        if (request.query) {
            for (const key in request.query) {
                if (typeof request.query[key] === "string") {
                    request.query[key] = xss(request.query[key]);
                }
            }
        }

        // Sanitiza request.params
        if (request.params) {
            for (const key in request.params) {
                if (typeof request.params[key] === "string") {
                    request.params[key] = xss(request.params[key]);
                }
            }
        }

        next();
    } catch (err) {
        console.log("error when trying to sanitize with xss", err);

        return response.status(400).json({
            error: 'Dados da requisição contêm conteúdo inválido'
        });
    }
});

//Isto faz com que os arquivos dentro da pasta 'public' possam ser acessados pelo URL
//ou por outros arquivos tipo um HTML que requisita um CSS ou JS
app.use(express.static('./public'));

// Servir arquivos estáticos da pasta data
app.use('/data', express.static('./data'));

//Routing para uma pagina que não existe,
//executa este routing caso o url inserido não exista
app.all('*', (request, response, next) => {
    const err = new CustomError('Page not found: 404. You are in: ' + request.url, 404);
    next(err);
});

//middleware para handling de erros globais no projeto
app.use(globalErrorHandler);

//exporta o objeto do app para o server.js
module.exports = app;