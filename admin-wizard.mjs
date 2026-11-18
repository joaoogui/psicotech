import {createInterface} from 'node:readline/promises';
import {one,run,uid,now,hashPassword,seal} from './db.mjs';
const rl=createInterface({input:process.stdin,output:process.stdout});
const email=(await rl.question('E-mail do administrador: ')).trim().toLowerCase();
const name=(await rl.question('Nome do administrador: ')).trim();
rl.close();
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!name)throw Error('Informe nome e e-mail válidos.');
if(one('SELECT id FROM users WHERE email=?',email))throw Error('Este e-mail já está cadastrado.');
async function passwordPrompt(label){
 if(!process.stdin.isTTY)throw Error('Abra CRIAR-ADMIN.bat em um terminal interativo.');
 process.stdout.write(label);process.stdin.setRawMode(true);process.stdin.resume();
 return new Promise((resolve,reject)=>{let value='';const read=chunk=>{for(const ch of chunk.toString()){
 if(ch==='\r'||ch==='\n'){process.stdin.off('data',read);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');resolve(value);return;}
 if(ch==='\u0003'){process.stdin.off('data',read);process.stdin.setRawMode(false);process.stdin.pause();reject(Error('Cancelado.'));return;}
 if(ch==='\u007f'||ch==='\b'){if(value.length){value=value.slice(0,-1);process.stdout.write('\b \b');}}else if(ch>=' '){value+=ch;process.stdout.write('*');}
 }};process.stdin.on('data',read);});
}
const password=await passwordPrompt('Senha (mínimo 12 caracteres): ');
if(password.length<12||password.length>128)throw Error('Use entre 12 e 128 caracteres.');
const confirm=await passwordPrompt('Confirme a senha: ');
if(password!==confirm)throw Error('As senhas não são iguais.');
run('INSERT INTO users(id,email,password,name,role,profile,created) VALUES(?,?,?,?,?,?,?)',uid(),email,hashPassword(password),name,'admin',seal({}),now());
console.log('Administrador criado. Abra o site e entre com seu e-mail e senha.');
