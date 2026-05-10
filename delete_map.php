<?php
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$name = $data['name'] ?? null;

if (!$name) {
    echo json_encode(['status' => 'error', 'message' => 'No se proporcionó el nombre del mapa.']);
    exit;
}

// Limpiar el nombre para evitar inyecciones de ruta
$name = preg_replace('/[^a-zA-Z0-9_\-]/', '', $name);
$file = "maps/{$name}.json";

if (file_exists($file)) {
    if (unlink($file)) {
        echo json_encode(['status' => 'success', 'message' => 'Mapa eliminado correctamente.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'No se pudo eliminar el archivo.']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'El mapa no existe.']);
}
?>
