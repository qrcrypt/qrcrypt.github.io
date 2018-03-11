import appTemplate from '../templates/app.njk';
import decryptTextTemplate from '../templates/decryptText.njk';
import encryptTextTemplate from '../templates/encryptText.njk';
import encryptQrTemplate from '../templates/encryptQr.njk';
import homeTemplate from '../templates/home.njk';
import qrPrintTemplate from '../templates/qrPrint.njk';
import qrTemplate from '../templates/qr.njk';

import base64 from 'base64-js';
import clipboard from 'clipboard';
import crypto from 'crypto';
import instascan from 'instascan';
import jssalsa20 from 'js-salsa20';
import pbkdf2 from 'pbkdf2';
import qrimage from 'qr-image';
import zxcvbn from 'zxcvbn';

class App
{
    constructor(rootId) {
        this.lastScanResult = '';

        this.$root = $(rootId);
        this.$root.html(appTemplate.render());

        this.cacheDom();
        this.bindEvents();

        this.showHome();
    }

    cacheDom() {
        this.$moduleRoot = $('#module-root');
    }

    bindEvents() {
        this.$root.on('click', '.js-show-home', this.showHome.bind(this));
        this.$root.on('click', '.js-start-encrypt-text', this.startEncryptText.bind(this));
        this.$root.on('click', '.js-start-decrypt-text', this.startDecryptText.bind(this));
        this.$root.on('click', '.js-start-encrypt-qr-code', this.startEncryptQrCode.bind(this));
        this.$root.on('click', '.js-start-decrypt-qr-code', this.startDecryptQrCode.bind(this));

        this.$root.on('keyup change focus blur paste cut', 'input[type="password"].js-zxcvbn', this.displayZxcvbnRating);
        this.$root.on('keyup change focus blur paste cut', '.js-encrypt-text-form input, .js-encrypt-text-form textarea', this.encryptText.bind(this));
        this.$root.on('keyup change focus blur paste cut', '.js-encrypt-qr-form input, .js-encrypt-qr-form textarea', this.encryptQr.bind(this));
        this.$root.on('keyup change focus blur paste cut', '.js-decrypt-text-form input, .js-decrypt-text-form textarea', this.decryptText.bind(this));
        this.$root.on('click', '.js-print-qr', this.printQr.bind(this));
    }

    showHome() {
        this.shutdownScanner();
        this.$moduleRoot.html(homeTemplate.render());
    }

    startEncryptQrCode() {
        this.shutdownScanner();
        this.scanCallback = this.encryptQr;

        this.$moduleRoot.html(encryptQrTemplate.render());
        this.$password = $('#password');
        this.$passwordConfirm = $('#password-confirm');
        this.$plainText = $('#plaintext');
        this.$cipherText = $('#ciphertext');
        this.$error = $('#error').hide();
        this.$qr = $('#qr');

        this.initClipboard();
        this.initScanner();
    }

    startDecryptQrCode() {
        this.shutdownScanner();
    }

    startDecryptText() {
        this.shutdownScanner();
        this.$moduleRoot.html(decryptTextTemplate.render());
        this.initClipboard();
        this.$password = $('#password');
        this.$plainText = $('#plaintext');
        this.$cipherText = $('#ciphertext');
        this.$error = $('#error').hide();
        this.$qr = $('#qr');
    }

    startEncryptText() {
        this.shutdownScanner();
        this.$moduleRoot.html(encryptTextTemplate.render());
        this.initClipboard();
        this.$password = $('#password');
        this.$passwordConfirm = $('#password-confirm');
        this.$plainText = $('#plaintext');
        this.$cipherText = $('#ciphertext');
        this.$error = $('#error').hide();
        this.$qr = $('#qr');
    }

    shutdownScanner() {
        this.lastScanResult = '';
        this.cameras = null;

        if (this.scanner) {
            this.scanner.stop();
        }
    }

    encryptQr() {
        this.$plainText.text(this.lastScanResult);

        if (!this.$password.val().trim()) {
            this.$cipherText.text('');
            return this.error('Empty password is not allowed');
        }

        if (this.$password.val() != this.$passwordConfirm.val()) {
            this.$cipherText.text('');
            return this.error('Passwords do not match');
        }

        if (!this.$plainText.text().trim()) {
            this.$cipherText.text('');
            return this.error('Plaintext is empty');
        }

        const cipherText = this.encryptStringToBase64(
            this.$plainText.text().trim(),
            this.$password.val().trim()
        );

        this.$cipherText.text(cipherText);
        this.createQr(cipherText);

        this.$error.hide();
    }

    decryptText() {
        if (!this.$password.val().trim()) {
            this.$plainText.text('');
            return this.error('Your password is empty');
        }

        if (!this.$cipherText.val().trim()) {
            this.$plainText.text('');
            return this.error('Ciphertext is empty');
        }

        const plainText = this.decryptStringFromBase64(
            this.$cipherText.val().trim(),
            this.$password.val().trim()
        );

        if (!plainText) {
            return this.error('Can not decode input string');
        }

        this.$plainText.text(plainText);
        this.createQr(plainText);

        this.$error.hide();
    }

    encryptText() {
        if (!this.$password.val().trim()) {
            this.$cipherText.text('');
            return this.error('Empty password is not allowed');
        }

        if (this.$password.val() != this.$passwordConfirm.val()) {
            this.$cipherText.text('');
            return this.error('Passwords do not match');
        }

        if (!this.$plainText.val().trim()) {
            this.$cipherText.text('');
            return this.error('Plaintext is empty');
        }

        const cipherText = this.encryptStringToBase64(
            this.$plainText.val().trim(),
            this.$password.val().trim()
        );

        this.$cipherText.text(cipherText);
        this.createQr(cipherText);

        this.$error.hide();
    }

    createQr(text) {
        const svg = qrimage.imageSync(text, { ec_level: 'M', type: 'svg' });

        this.$qr.html(qrTemplate.render({ svg: svg }));
    }

    printQr() {
        const printWindow = window.open('#', '_blank');

        printWindow.document.write(qrPrintTemplate.render({ svg: this.$qr.find('.svg').html() }));
        printWindow.print();
    }

    initScanner() {
        this.preview = this.$root.find('.scanner .preview').get(0);
        this.$cameraSelector = this.$root.find('.scanner .camera-selector');
        this.$cameraSelector.on('change', () => {
            this.initCamera(this.$cameraSelector.val());
        });

        instascan.Camera.getCameras().then((cameras) => {
            if (cameras.length > 0) {
                for (let i = 0; i < cameras.length; i ++) {
                    this.$cameraSelector.append(
                        $('<option/>').text(cameras[i].name).attr('val', i)
                    );
                }
                this.cameras = cameras;
                this.initCamera(0);
            } else {
                this.error('No cameras found.');
            }
        });
    }

    initCamera(index) {
        this.scanner = new instascan.Scanner({
            video: this.preview
        });

        this.scanner.start(this.cameras[index]);
        this.scanner.on('scan', (result) => {
            this.lastScanResult = result;
            this.scanCallback();
        });
    }

    error(message) {
        this.$qr.html('');
        this.$error.html(message).show();
    }

    encryptStringToBase64(text, password) {
        const key = this.deriveKeyAndNonceFromPassword(password);

        const salsa = new jssalsa20(key.key, key.nonce);

        return base64.fromByteArray(salsa.encrypt((new TextEncoder()).encode(text)));
    }

    decryptStringFromBase64(ciphertext, password) {
        const key = this.deriveKeyAndNonceFromPassword(password);

        const salsa = new jssalsa20(key.key, key.nonce);

        try {
            ciphertext = base64.toByteArray(ciphertext);
        } catch (error) {
            return null;
        }

        const decryptedStream = salsa.decrypt(ciphertext);

        return (new TextDecoder()).decode(decryptedStream);
    }

    deriveKeyAndNonceFromPassword(password) {
        const salt = crypto.createHash('rmd160').update(password).digest('hex');

        const pkey = pbkdf2.pbkdf2Sync(password, salt, 4096, 40, 'sha512');

        return {
            key: pkey.slice(0, 32),
            nonce: pkey.slice(32)
        }
    }

    displayZxcvbnRating(event) {
        const $target = $(event.currentTarget);
        const $small = $target.next('small');

        if ($target.val().trim() === '') {
            $small.html('');
        } else {
            const rating = zxcvbn($target.val());

            $small.html(`<a href="https://github.com/dropbox/zxcvbn" target="_blank">Zxcvbn</a> fast crack time: ${rating.crack_times_display.offline_fast_hashing_1e10_per_second} `);
        }
    }

    initClipboard() {
        if (this.clipboard) {
            this.clipboard.destroy();
        }

        this.clipboard = new clipboard('.js-copy', {
            target: function (trigger) {
                const $trigger = $(trigger);

                return $trigger.next().get(0);
            }
        });

        this.clipboard.on('success', function (event) {
            const $trigger = $(event.trigger);
            event.clearSelection();

            const triggerText = $trigger.text();

            $trigger.text('copied!');

            setTimeout(() => {
                $trigger.text(triggerText);
            }, 1000);
        })
    }
}

const qrcrypt = new App('#app');

