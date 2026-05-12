<?php
// save_physics.php
$data = json_decode(file_get_contents('php://input'), true);

if ($data) {
    file_put_contents('js/core/physics_config.json', json_encode($data, JSON_PRETTY_PRINT));
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => "No data received"]);
}
?>
