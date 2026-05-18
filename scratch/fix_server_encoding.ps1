
$path = "c:\Users\LG\AI자동화\project_bustaams\busTaams_server\server.js"
$encoding = [System.Text.Encoding]::UTF8
$content = [System.IO.File]::ReadAllText($path, $encoding)

# Fix seeds array - using part of the string to be safe
$content = $content.Replace("['BUS_TYPE', 'V_VIP', 'V-VIP', '16??리무?, 'Y', 5]", "['BUS_TYPE', 'V_VIP', 'V-VIP', '16석 리무진', 'Y', 5]")
$content = $content.Replace("isRequired: ""N"" }", "isRequired: 'N' }")

# Regex fixes
$content = [regex]::Replace($content, "base\.replace\(/\[\^a-zA-Z0-9\._-.*", "base.replace(/[^a-zA-Z0-9._-가-힣]/g, '_').replace(/\.+$/, '') || 'file';")
$content = [regex]::Replace($content, "CD_NM_KO varchar\(100\) NOT NULL COMMENT '[^']*?,", "CD_NM_KO varchar(100) NOT NULL COMMENT '코드 명칭 (한글)',")

[System.IO.File]::WriteAllText($path, $content, $encoding)
