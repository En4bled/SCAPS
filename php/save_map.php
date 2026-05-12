<?php
// Evitar que PHP envíe cualquier error como HTML
ini_set('display_errors', 0);
error_reporting(E_ALL);
header('Content-Type: application/json');

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (isset($data['name']) && isset($data['config'])) {
    // Limpiar el nombre del archivo
    $name = preg_replace('/[^a-zA-Z0-9_-]/', '', $data['name']);
    if (empty($name)) $name = "mapa_sin_nombre";
    
    $dir = '../maps/';
    $filePath = $dir . $name . '.json';
    
    // Verificar si el directorio existe
    if (!is_dir($dir)) {
        echo json_encode(['status' => 'error', 'message' => "El directorio 'maps/' no existe"]);
        exit;
    }

    // Verificar permisos de escritura
    if (!is_writable($dir)) {
        echo json_encode(['status' => 'error', 'message' => "No hay permisos de escritura en '$dir'"]);
        exit;
    }
    
    // Intentar guardar
    $jsonContent = json_encode($data['config'], JSON_PRETTY_PRINT);
    if ($jsonContent === false) {
        echo json_encode(['status' => 'error', 'message' => 'Error al procesar el JSON de la configuración (datos corruptos o demasiado grandes)']);
        exit;
    }

    if (file_put_contents($filePath, $jsonContent)) {
        echo json_encode(['status' => 'success', 'message' => "Mapa '$name' guardado correctamente"]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Error interno al escribir el archivo. Verifica el espacio en disco.']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Datos insuficientes o JSON malformado']);
}
?>
