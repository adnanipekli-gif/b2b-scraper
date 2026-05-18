const LOGO_URL =
  'https://www.ndgrouptr.com/wp-content/uploads/2025/07/NDGC_Logo_Kare72dpiRGB.png'

const P  = 'margin:0 0 16px 0;color:#f5f5f5;font-size:15px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;'
const LI = 'margin:0 0 8px 0;color:#f5f5f5;font-size:15px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;'
const A  = 'color:#08b2c5;text-decoration:none;'

function styleBody(html: string): string {
  return html
    .replace(/<p>/gi, `<p style="${P}">`)
    .replace(/<p ((?!style)[^>]*)>/gi, `<p style="${P}" $1>`)
    .replace(/<div>/gi, `<div style="${P}">`)
    .replace(/<div ((?!style)[^>]*)>/gi, `<div style="${P}" $1>`)
    .replace(/<li>/gi, `<li style="${LI}">`)
    .replace(/<a ((?!style)[^>]*href)/gi, `<a style="${A}" $1`)
}

export function wrapEmailWithBranding(bodyHtml: string): string {
  const content = styleBody(bodyHtml?.trim() || `<p style="${P}">—</p>`)

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin:0;padding:0;background:#152028;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#152028;">
  <tr>
    <td align="center" style="padding:20px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:#223f4f;border-radius:10px 10px 0 0;padding:24px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <!-- Logo — left -->
                <td valign="middle" style="width:110px;">
                  <img src="${LOGO_URL}" alt="ND Group Companies" width="90"
                       style="display:block;max-width:90px;width:100%;height:auto;border:0;outline:0;">
                </td>
                <!-- Company info — right -->
                <td valign="middle" align="right" style="padding-left:16px;">
                  <p style="margin:0 0 2px 0;color:#08b2c5;font-size:14px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.5px;">ND Group Companies</p>
                  <p style="margin:0 0 2px 0;font-size:11px;font-family:Arial,Helvetica,sans-serif;"><a href="https://www.ndgrouptr.com" style="color:#08b2c5;text-decoration:none;">www.ndgrouptr.com</a></p>
                  <p style="margin:0;color:#a8c4cc;font-size:11px;font-family:Arial,Helvetica,sans-serif;">Emek Mah. Şems Cad. No:7 Sancaktepe, İstanbul TÜRKİYE</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HEADER DIVIDER -->
        <tr>
          <td height="3" bgcolor="#08b2c5" style="background:#08b2c5;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#223f4f;padding:32px 36px 28px;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;">
            ${content}
            <!-- SIGNATURE -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
              <tr>
                <td height="1" bgcolor="#08b2c5" style="background:#08b2c5;font-size:0;line-height:0;">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding-top:16px;">
                  <p style="margin:0 0 2px 0;color:#f5f5f5;font-size:14px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">Gözde İPEKLİ</p>
                  <p style="margin:0 0 2px 0;color:#a8c4cc;font-size:13px;font-family:Arial,Helvetica,sans-serif;">ND Group Marka ve Müşteri Yöneticisi</p>
                  <p style="margin:0;font-size:13px;font-family:Arial,Helvetica,sans-serif;">
                    <a href="mailto:gozdeipekli@ndgrouptr.com" style="color:#08b2c5;text-decoration:none;">gozdeipekli@ndgrouptr.com</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER DIVIDER -->
        <tr>
          <td height="3" bgcolor="#08b2c5" style="background:#08b2c5;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td align="center" style="background:#1a2f3d;border-radius:0 0 10px 10px;padding:16px 32px;">
            <p style="margin:0 0 4px 0;color:#08b2c5;font-size:12px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">ND Group Companies</p>
            <p style="margin:0 0 2px 0;color:#7a9daa;font-size:11px;font-family:Arial,Helvetica,sans-serif;">
              <a href="https://www.ndgrouptr.com" style="color:#7a9daa;text-decoration:none;">www.ndgrouptr.com</a>
            </p>
            <p style="margin:0;color:#7a9daa;font-size:11px;font-family:Arial,Helvetica,sans-serif;">Emek Mahallesi Şems Caddesi No:7 Sancaktepe, İstanbul TÜRKİYE</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}
