"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./routes"));
const swagger_1 = require("./swagger");
const cors_1 = __importDefault(require("cors"));
exports.app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
exports.app.use((0, cors_1.default)({
    origin: 'http://localhost:5173', // La URL de tu Frontend Vite
    credentials: true,
}));
exports.app.use(express_1.default.json());
exports.app.use('/api', routes_1.default);
(0, swagger_1.setupSwagger)(exports.app);
exports.app.get('/', (req, res) => {
    res.send('¡API funcionando correctamente!');
});
if (process.env.NODE_ENV !== 'test') {
    exports.app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
}
