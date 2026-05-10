<?php
header('Content-Type: application/json');
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (isset($data['name']) && isset($data['config'])) {
    $name = preg_replace('/[^a-zA-Z0-9_-]/', '', $data['name']);
    if (empty($name)) $name = "mapa_sin_nombre";
    
    $filePath = 'maps/' . $name . '.json';
    
    if (file_put_contents($filePath, json_encode($data['config']))) {
        echo json_encode(['status' => 'success', 'message' => "Mapa '$name' guardado correctamente"]);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'No se pudo guardar el archivo JSON']);
    }
} else {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Datos insuficientes']);
}
?>
