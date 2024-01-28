def get_box_binary():
    return ["0000", "0001", "0010", "0011", "0100", "0101", "0110", "0111", "1000", "1001", "1010", "1011", "1100", "1101", "1110", "1111"]


def process_chunk(chunk_data, key_bts):
    enc_byte = str_to_bt(chunk_data)
    for bt in key_bts:
        if bt is None:
            return enc_byte
        for i in range(len(bt)):
            enc_byte = enc(enc_byte, bt[i])
    return enc_byte


def str_enc(data, key1, key2, key3):
    if not data:
        return ""

    bt1 = get_key_bytes(key1) if key1 else None
    bt2 = get_key_bytes(key2) if key2 else None
    bt3 = get_key_bytes(key3) if key3 else None

    if not bt1 and not bt2 and not bt3:
        return ""

    enc_data = ""
    iterator = (len(data) + 3) // 4  # ceil division

    for i in range(iterator):
        temp_data = data[i*4: (i+1)*4]
        enc_byte = process_chunk(temp_data, [bt1, bt2, bt3])
        enc_data += bt64_to_hex(enc_byte)

    return enc_data


def str_dec(data, key1, key2, key3):
    if not data:
        return ""

    bt1 = get_key_bytes(key1) if key1 else None
    bt2 = get_key_bytes(key2) if key2 else None
    bt3 = get_key_bytes(key3) if key3 else None

    if not bt1 and not bt2 and not bt3:
        return ""

    dec_str = ""
    iterator = len(data) // 16
    for i in range(iterator):
        temp_data = data[i*16: (i+1)*16]
        str_byte = hex_to_bt64(temp_data)
        dec_byte = [int(str_byte[j]) for j in range(64)]
        for bt in [bt3, bt2, bt1]:
            if bt is None:
                continue
            for x in range(len(bt) - 1, -1, -1):
                dec_byte = dec(dec_byte, bt[x])
        dec_str += byte_to_string(dec_byte)

    return dec_str


def get_key_bytes(key):
    key_bytes = []
    iterator = len(key) // 4
    i = 0
    for i in range(iterator):
        key_bytes.append(str_to_bt(key[i*4: i*4+4]))
    if len(key) % 4 > 0:
        key_bytes.append(str_to_bt(key[i*4:]))
    return key_bytes


def str_to_bt(s):
    bt = [0] * 64
    for i in range(4):
        k = ord(s[i]) if i < len(s) else 0
        for j in range(16):
            bt[16 * i + j] = (k >> (15 - j)) & 1
    return bt


def hex_to_bt4(hex):
    return bin(int(hex, 16))[2:].zfill(4)


def byte_to_string(byte_data):
    s = ""
    for i in range(4):
        count = sum((val << (15 - idx)) for idx, val in enumerate(byte_data[i * 16: (i + 1) * 16]))
        if count != 0:
            s += chr(count)
    return s


def bt64_to_hex(byte_data):
    hex_str = ""
    for i in range(16):
        bt = ''.join(map(str, byte_data[i*4: (i+1)*4]))
        hex_str += bt4_to_hex(bt)
    return hex_str


def bt4_to_hex(bt):
    return hex(int(bt, 2))[2:].upper()


def hex_to_bt64(hex):
    binary = ""
    for i in range(16):
        binary += hex_to_bt4(hex[i])
    return binary


# mode = 0 enc 1 dec
def _enc_dec(data_byte, key_byte, mode=0):
    keys = generate_keys(key_byte)
    ip_byte = init_permute(data_byte)
    ip_left = ip_byte[:32]
    ip_right = ip_byte[32:]

    loop = (range(16) if mode == 0 else range(15, -1, -1))
    for i in loop:
        key = keys[i]
        temp_right = xor(p_permute(s_box_permute(xor(expand_permute(ip_right), key))), ip_left)
        ip_left, ip_right = ip_right, temp_right

    final_data = ip_right + ip_left
    return finally_permute(final_data)


def enc(data_byte, key_byte):
    return _enc_dec(data_byte, key_byte, 0)


def dec(data_byte, key_byte):
    return _enc_dec(data_byte, key_byte, 1)


def init_permute(original_data):
    ip_byte = [0] * 64
    for i in range(4):
        for j in range(7, -1, -1):
            k = j * 8 + (i * 2 + 1)
            l = j * 8 + (i * 2)
            ip_byte[i * 8 + (7 - j)] = original_data[k]
            ip_byte[i * 8 + (7 - j) + 32] = original_data[l]
    return ip_byte


def expand_permute(right_data):
    ep_byte = [0] * 48
    for i in range(8):
        for j in range(6):
            index = i * 4 + j - 1
            if i == 0 and j == 0:
                index = 31
            elif i == 7 and j == 5:
                index = 0
            ep_byte[i * 6 + j] = right_data[index]
    return ep_byte


def xor(byte_one, byte_two):
    xor_byte = [0] * len(byte_one)
    for i in range(len(byte_one)):
        xor_byte[i] = byte_one[i] ^ byte_two[i]
    return xor_byte


def s_box_permute(expand_byte):
    s = [[[14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7], [0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8], [4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0], [15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13]], [[15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10], [3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5], [0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15], [13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9]], [[10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8], [13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1], [13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7], [1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12]], [[7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15], [13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9], [10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4], [3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14]], [[2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9], [14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6], [4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14], [11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3]], [[12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11], [10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8], [9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6], [4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13]], [[4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1], [13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6], [1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2], [6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12]], [[13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7], [1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2], [7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8], [2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11]]]
    s_box_byte = [0] * 32
    for m in range(8):
        i = expand_byte[m * 6 + 0] * 2 + expand_byte[m * 6 + 5]
        j = (expand_byte[m * 6 + 1] * 8 +
             expand_byte[m * 6 + 2] * 4 +
             expand_byte[m * 6 + 3] * 2 +
             expand_byte[m * 6 + 4])
        binary = get_box_binary()[s[m][i][j]]
        for n in range(4):
            s_box_byte[m * 4 + n] = int(binary[n])
    return s_box_byte


def p_permute(s_box_byte):
    p_box_permute = [0] * 32
    p_box_index = [15, 6, 19, 20, 28, 11, 27, 16, 0, 14, 22, 25, 4, 17, 30, 9, 1, 7, 23, 13, 31, 26, 2, 8, 18, 12, 29, 5, 21, 10, 3, 24]
    for i in range(32):
        p_box_permute[i] = s_box_byte[p_box_index[i]]
    return p_box_permute


def finally_permute(end_byte):
    fp_byte = [0] * 64
    end_index = [39, 7, 47, 15, 55, 23, 63, 31, 38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29, 36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27, 34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49, 17, 57, 25, 32, 0, 40, 8, 48, 16, 56, 24]
    for i in range(64):
        fp_byte[i] = end_byte[end_index[i]]
    return fp_byte


def generate_keys(key_byte):
    key = [0] * 56
    for i in range(7):
        for j, k in enumerate(range(7, -1, -1)):
            key[i * 8 + j] = key_byte[8 * k + i]

    keys = []
    for i in range(16):
        for j in range([1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1][i]):
            key = key[1:28] + [key[0]] + key[29:56] + [key[28]]
        key_index = [13, 16, 10, 23, 0, 4, 2, 27, 14, 5, 20, 9, 22, 18, 11, 3, 25, 7, 15, 6, 26, 19, 12, 1, 40, 51, 30, 36, 46, 54, 29, 39, 50, 44, 32, 47, 43, 48, 38, 55, 33, 52, 45, 41, 49, 35, 28, 31]
        keys.append([key[index] for index in key_index])
    return keys
