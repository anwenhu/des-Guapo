var getBoxBinary = ["0000", "0001", "0010", "0011", "0100", "0101", "0110", "0111", "1000", "1001", "1010", "1011", "1100", "1101", "1110", "1111"]

function processChunk(chunkData, keyBts) {
    var encByte = strToBt(chunkData);
    for (var bt of keyBts) {
        if (bt == null) { return encByte; }
        for (var i = 0; i < bt.length; i++) {
            encByte = enc(encByte, bt[i]);
        }
    }
    return encByte;
}

function strEnc(data, key1, key2, key3) {
    if (data.length <= 0) { return ""; }

    var bt1 = key1 ? getKeyBytes(key1) : null;
    var bt2 = key2 ? getKeyBytes(key2) : null;
    var bt3 = key3 ? getKeyBytes(key3) : null;

    if (!bt1 && !bt2 && !bt3) { return ""; }

    var encData = "";
    var iterator = Math.ceil(data.length / 4);

    for (var i = 0; i < iterator; i++) {
        var tempData = data.substring(i * 4, (i + 1) * 4);
        var encByte = processChunk(tempData, [bt1, bt2, bt3]);
        encData += bt64ToHex(encByte);
    }

    return encData;
}


function getKeyBytes(key) {
    var keyBytes = new Array();
    var iterator = parseInt(key.length / 4);
    for (var i = 0; i < iterator; i++) {
        keyBytes[i] = strToBt(key.substring(i * 4 + 0, i * 4 + 4));
    }
    if (key.length % 4 > 0) {
        keyBytes[i] = strToBt(key.substring(i * 4 + 0, key.length));
    }
    return keyBytes;
}


function strToBt(str) {
    var bt = new Array(64);

    for (var i = 0; i < 4; i++) {
        var k = i < str.length ? str.charCodeAt(i) : 0;
        for (var j = 0; j < 16; j++) {
            var pow = Math.pow(2, 15 - j);
            bt[16 * i + j] = Math.floor(k / pow) % 2;
        }
    }
    return bt;
}

function hexToBt4(hex) {
    var binary = (parseInt(hex, 16)).toString(2).padStart(4, "0");
    return binary;
}

function byteToString(byteData) {
    var str = "";
    for (var i = 0; i < 4; i++) {
        var count = byteData.slice(i * 16, (i + 1) * 16).reduce((acc, val, idx) => acc + (val << (15 - idx)), 0);
        if (count != 0) { str += String.fromCharCode(count); }
    }
    return str;
}

function bt64ToHex(byteData) {
    var hex = "";
    for (var i = 0; i < 16; i++) {
        var bt = byteData.slice(i * 4, (i + 1) * 4).join('');
        hex += bt4ToHex(bt);
    }
    return hex;
}

function bt4ToHex(bt) {
    return parseInt(bt, 2).toString(16).toUpperCase();
}

function hexToBt64(hex) {
    var binary = "";
    for (var i = 0; i < 16; i++) {
        binary += hexToBt4(hex.substring(i, i + 1));
    }
    return binary;
}

// mode = 0 enc 1 dec
function _enc_dec(dataByte, keyByte, mode = 0) {
    var keys = generateKeys(keyByte);
    var ipByte = initPermute(dataByte);
    var ipLeft = ipByte.slice(0, 32);
    var ipRight = ipByte.slice(32);

    var loop = (mode === 0) ? { start: 0, end: 16, step: 1 } : { start: 15, end: -1, step: -1 };
    for (var i = loop.start; i !== loop.end; i += loop.step) {
        var key = keys[i];
        var tempRight = xor(pPermute(sBoxPermute(xor(expandPermute(ipRight), key))), ipLeft);
        [ipLeft, ipRight] = [ipRight, tempRight];
    }

    var finalData = ipRight.concat(ipLeft);
    return finallyPermute(finalData);
}

function enc(dataByte, keyByte) {
    return _enc_dec(dataByte, keyByte, 0);
}


function initPermute(originalData) {
    var ipByte = new Array(64);
    for (var i = 0; i < 4; i++) {
        for (var j = 7, k = 0; j >= 0; j--, k++) {
            ipByte[i * 8 + k] = originalData[j * 8 + (i * 2 + 1)];
            ipByte[i * 8 + k + 32] = originalData[j * 8 + (i * 2)];
        }
    }
    return ipByte;
}

function expandPermute(rightData) {
    var epByte = new Array(48);
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 6; j++) {
            var index = i * 4 + j - 1;
            if (i == 0 && j == 0) { index = 31; }
            else if (i == 7 && j == 5) { index = 0; }
            epByte[i * 6 + j] = rightData[index];
        }
    }
    return epByte;
}

function xor(byteOne, byteTwo) {
    var xorByte = new Array(byteOne.length);
    for (var i = 0; i < byteOne.length; i++) {
        xorByte[i] = byteOne[i] ^ byteTwo[i];
    }
    return xorByte;
}

function sBoxPermute(expandByte) {
    var s = [[[14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7], [0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8], [4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0], [15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13]], [[15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10], [3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5], [0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15], [13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9]], [[10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8], [13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1], [13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7], [1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12]], [[7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15], [13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9], [10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4], [3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14]], [[2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9], [14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6], [4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14], [11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3]], [[12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11], [10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8], [9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6], [4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13]], [[4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1], [13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6], [1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2], [6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12]], [[13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7], [1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2], [7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8], [2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11]]]
    var sBoxByte = new Array(32);
    for (var m = 0; m < 8; m++) {
        var i = expandByte[m * 6 + 0] * 2 + expandByte[m * 6 + 5];
        var j = expandByte[m * 6 + 1] * 2 * 2 * 2
            + expandByte[m * 6 + 2] * 2 * 2
            + expandByte[m * 6 + 3] * 2
            + expandByte[m * 6 + 4];
        var binary = getBoxBinary[s[m][i][j]];
        for (i = 0; i < 4; i++) { sBoxByte[m * 4 + i] = parseInt(binary.substring(i, i + 1)); }
    }
    return sBoxByte;
}

function pPermute(sBoxByte) {
    var pBoxPermute = new Array(32);
    var sBoxIndex = [15, 6, 19, 20, 28, 11, 27, 16, 0, 14, 22, 25, 4, 17, 30, 9, 1, 7, 23, 13, 31, 26, 2, 8, 18, 12, 29, 5, 21, 10, 3, 24];
    for (var i = 0; i < 32; i++) {
        pBoxPermute[i] = sBoxByte[sBoxIndex[i]];
    }
    return pBoxPermute;
}

function finallyPermute(endByte) {
    var fpByte = new Array(64);
    var endIndex = [39, 7, 47, 15, 55, 23, 63, 31, 38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29, 36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27, 34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49, 17, 57, 25, 32, 0, 40, 8, 48, 16, 56, 24];
    for (var i = 0; i < 64; i++) {
        fpByte[i] = endByte[endIndex[i]];
    }
    return fpByte;
}


function generateKeys(keyByte) {
    var key = new Array(56);
    for (var i = 0; i < 7; i++) {
        for (var j = 0, k = 7; j < 8; j++, k--) {
            key[i * 8 + j] = keyByte[8 * k + i];
        }
    }

    var keys = [];
    for (i = 0; i < 16; i++) {
        for (j = 0; j < [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1][i]; j++) {
            key = [...key.slice(1, 28), key[0], ...key.slice(29, 56), key[28]];
        }
        var keyIndex = [13, 16, 10, 23, 0, 4, 2, 27, 14, 5, 20, 9, 22, 18, 11, 3, 25, 7, 15, 6, 26, 19, 12, 1, 40, 51, 30, 36, 46, 54, 29, 39, 50, 44, 32, 47, 43, 48, 38, 55, 33, 52, 45, 41, 49, 35, 28, 31];
        keys[i] = keyIndex.map(index => key[index]);
    }
    return keys;
}
