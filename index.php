<?php
    $manifest = json_decode(file_get_contents(__DIR__.'/build/manifest.json'), true);

    function asset($key) {
        global $manifest;
        $type = substr($key, -3) == 'css' ? 'css' : 'js';

        // start
        echo $type == 'css' ?
            '<link rel="stylesheet" crossorigin="anonymous" href="'.$manifest[$key].'"' :
            '<script crossorigin="anonymous" src="'.$manifest[$key].'"';

        if ($manifest[$key][0] == '/') {
            echo ' integrity="sha384-'.base64_encode(hash('sha384', file_get_contents(__DIR__.'/'.$manifest[$key]), true)).'"';
        }

        // end
        echo $type == 'css' ?
            '>' :
            '></script>';
    }
?><!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

    <?= asset('build/style.css') ?>

    <title>QrCrypt by Andrew Tch</title>
</head>
<body>


<div class="container">
    <div class="col-12">
        <div id="app">

        </div>
    </div>
</div>


<?= asset('build/app.js') ?>
</body>
</html>
