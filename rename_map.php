<?php
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$oldName = $data['oldName'] ?? null;
$newName = $data['newName'] ?? null;

if (!$oldName || !$newName) {
    echo json_encode(['status' => 'error', 'message' => 'Faltan nombres.']);
    exit;
}

$oldName = preg_replace('/[^a-zA-Z0-9_\-]/', '', $oldName);
$newName = preg_replace('/[^a-zA-Z0-9_\-]/', '', $newName);

$oldFile = "maps/{$oldName}.json";
$newFile = "maps/{$newName}.json";

if (!file_exists($oldFile)) {
    echo json_encode(['status' => 'error', 'message' => 'El mapa original no existe.']);
    exit;
}

if (file_exists($newFile)) {
    echo json_encode(['status' => 'error', 'message' => 'Ya existe un mapa con el nuevo nombre.']);
    exit;
}

if (rename($oldFile, $newFile)) {
    echo json_encode(['status' => 'success']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Error al renombrar.']);
}
?>
