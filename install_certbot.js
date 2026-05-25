const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection successful! Starting Certbot installation and SSL configuration...');
  
  const cmd = 'apt-get update && apt-get install -y certbot python3-certbot-nginx';
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      console.log('Certbot installation stream closed with code: ' + code);
      if (code === 0) {
        console.log('Certbot installed successfully. Now running certbot for bustaams.cafe24.com...');
        runCertbot();
      } else {
        console.error('Certbot installation failed.');
        conn.end();
      }
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });

  function runCertbot() {
    // Run certbot in non-interactive mode. Redirect standard inputs or use flags.
    const certbotCmd = 'certbot --nginx -d bustaams.cafe24.com --non-interactive --agree-tos --email dohunkim72@gmail.com --redirect';
    conn.exec(certbotCmd, (err, stream) => {
      if (err) {
        console.error('Certbot exec error:', err);
        conn.end();
        return;
      }
      stream.on('close', (code, signal) => {
        console.log('Certbot run closed with code: ' + code);
        if (code === 0) {
          console.log('SSL certificate configured successfully!');
          // Print nginx status to see if it restarted
          conn.exec('systemctl status nginx', (err2, stream2) => {
             stream2.on('data', d => console.log(d.toString())).on('close', () => conn.end());
          });
        } else {
          console.error('Certbot failed to obtain SSL certificate.');
          conn.end();
        }
      }).on('data', (data) => {
        process.stdout.write(data.toString());
      }).stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
    });
  }

}).on('error', (err) => {
  console.error('Connection error:', err);
}).connect({
  host: '1.234.65.153',
  port: 22,
  username: 'root',
  password: 'Bus7878!'
});
