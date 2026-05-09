<?php
header('Content-Type: application/json');
$maps = [];
$dir = 'maps/';

if (is_dir($dir)) {
    $files = scandir($dir);
    foreach ($files as $file) {
        if (pathinfo($file, PATHINFO_EXTENSION) === 'json') {
            $maps[] = pathinfo($file, PATHINFO_FILENAME);
        }
    }
}

echo json_encode($maps);
?>
