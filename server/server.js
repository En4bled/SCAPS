import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3000;
const wss = new WebSocketServer({ port: PORT });

// Almacena las salas activas. Estructura:
// {
//   "CODE": {
//     host: wsClient,
//     client: wsClient,
//     createdAt: timestamp
//   }
// }
const rooms = new Map();

console.log(`[SCAPS Server] Servidor de WebSockets iniciado en el puerto ${PORT}`);

wss.on('connection', (ws) => {
    let currentRoomCode = null;
    let currentRole = null; // 'host' o 'client'

    console.log('[SCAPS Server] Nueva conexión de cliente establecida');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'create': {
                    // Generar un código único de 4 dígitos
                    let roomCode;
                    let attempts = 0;
                    do {
                        roomCode = Math.floor(1000 + Math.random() * 9000).toString();
                        attempts++;
                    } while (rooms.has(roomCode) && attempts < 100);

                    rooms.set(roomCode, {
                        host: ws,
                        client: null,
                        createdAt: Date.now()
                    });

                    currentRoomCode = roomCode;
                    currentRole = 'host';

                    ws.send(JSON.stringify({
                        type: 'created',
                        roomCode: roomCode
                    }));
                    console.log(`[SCAPS Server] Sala creada: ${roomCode}`);
                    break;
                }

                case 'join': {
                    const code = data.roomCode;
                    if (!rooms.has(code)) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: `La sala ${code} no existe.`
                        }));
                        console.log(`[SCAPS Server] Intento de unirse a sala inexistente: ${code}`);
                        break;
                    }

                    const room = rooms.get(code);
                    if (room.client !== null) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: `La sala ${code} ya está completa.`
                        }));
                        console.log(`[SCAPS Server] Intento de unirse a sala llena: ${code}`);
                        break;
                    }

                    room.client = ws;
                    currentRoomCode = code;
                    currentRole = 'client';

                    // Confirmar al cliente que se unió
                    ws.send(JSON.stringify({
                        type: 'joined',
                        roomCode: code,
                        role: 'client'
                    }));

                    // Notificar al host que el rival se unió
                    room.host.send(JSON.stringify({
                        type: 'player_joined',
                        role: 'host'
                    }));

                    console.log(`[SCAPS Server] Jugador unido a la sala: ${code}`);
                    break;
                }

                case 'state': {
                    if (!currentRoomCode || !rooms.has(currentRoomCode)) return;
                    const room = rooms.get(currentRoomCode);

                    // Reenviar el estado al otro jugador de la sala
                    if (currentRole === 'host') {
                        if (room.client && room.client.readyState === 1) { // 1 = OPEN
                            room.client.send(message);
                        }
                    } else if (currentRole === 'client') {
                        if (room.host && room.host.readyState === 1) {
                            room.host.send(message);
                        }
                    }
                    break;
                }

                case 'goal':
                case 'reset':
                case 'chat':
                case 'settings_sync': {
                    if (!currentRoomCode || !rooms.has(currentRoomCode)) return;
                    const room = rooms.get(currentRoomCode);

                    // Reenviar mensaje al rival
                    const target = (currentRole === 'host') ? room.client : room.host;
                    if (target && target.readyState === 1) {
                        target.send(message);
                    }
                    break;
                }

                case 'ping': {
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
                }

                default:
                    console.log(`[SCAPS Server] Tipo de mensaje desconocido: ${data.type}`);
            }
        } catch (e) {
            console.error('[SCAPS Server] Error procesando mensaje:', e);
        }
    });

    ws.on('close', () => {
        console.log('[SCAPS Server] Cliente desconectado');
        if (currentRoomCode && rooms.has(currentRoomCode)) {
            const room = rooms.get(currentRoomCode);
            if (currentRole === 'host') {
                // Si el host se desconecta, cerramos la sala y avisamos al cliente
                if (room.client && room.client.readyState === 1) {
                    room.client.send(JSON.stringify({
                        type: 'opponent_disconnected',
                        message: 'El creador de la sala se ha desconectado.'
                    }));
                }
                rooms.delete(currentRoomCode);
                console.log(`[SCAPS Server] Sala destruida (Host se desconectó): ${currentRoomCode}`);
            } else if (currentRole === 'client') {
                // Si el cliente se desconecta, avisamos al host y permitimos que la sala quede libre o la cerramos
                if (room.host && room.host.readyState === 1) {
                    room.host.send(JSON.stringify({
                        type: 'opponent_disconnected',
                        message: 'El rival se ha desconectado.'
                    }));
                }
                room.client = null;
                console.log(`[SCAPS Server] Cliente abandonó la sala: ${currentRoomCode}. Host permanece a la espera.`);
            }
        }
    });
});
