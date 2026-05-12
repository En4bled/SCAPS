<?php
// save_config.php - Guarda la configuración desde el editor a constants.js
header('Content-Type: application/json');

// Recibir los datos POST
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (isset($data['code'])) {
    $filePath = '../js/core/constants.js';
    
    // Intentar escribir el archivo
    if (file_put_contents($filePath, $data['code'])) {
        echo json_encode(['status' => 'success', 'message' => 'Archivo constants.js actualizado correctamente']);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'No se pudo escribir en js/core/constants.js. Comprueba los permisos.']);
    }
} else {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No se recibió el código de configuración']);
}
?>
