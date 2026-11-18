import {randomBytes} from 'node:crypto';
import {one,run,uid,now,hashPassword,seal,digest} from './db.mjs';
const [command,email,name]=process.argv.slice(2);
if(command==='create'&&email&&name){
 const password=process.env.ADMIN_PASSWORD;
 if(!password||password.length<12)throw Error('Defina ADMIN_PASSWORD com ao menos 12 caracteres no ambiente.');
 if(one('SELECT id FROM users WHERE email=?',email))throw Error('E-mail já cadastrado.');
 run('INSERT INTO users(id,email,password,name,role,profile,created) VALUES(?,?,?,?,?,?,?)',uid(),email.toLowerCase(),hashPassword(password),name,'admin',seal({}),now());
 console.log('Administrador criado. Entre usando o e-mail e senha definidos.');
}else if(command==='reset'&&email){
 const u=one('SELECT id FROM users WHERE email=?',email);if(!u)throw Error('Conta não encontrada.');
 const token=randomBytes(32).toString('hex');run('INSERT INTO resets VALUES(?,?,?)',digest(token),u.id,Date.now()+1800000);
 console.log(`${process.env.APP_URL||'http://localhost:3000'}/?reset=${token}`);
}else console.log('Uso: npm run admin -- create email "Nome" (ADMIN_PASSWORD no ambiente)\nOu: npm run admin -- reset email');
