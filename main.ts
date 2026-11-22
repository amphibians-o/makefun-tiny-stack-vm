import {readdirSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';

// Metadata is indexed by the opcode byte, including when a jump enters an immediate.
const meta=Array(256).fill(null);
function def(op,imm,pop,push){meta[op]=[imm,pop,push];}
def(0,0,0,0);def(1,1,0,1);def(2,4,0,1);
def(3,0,1,0);def(4,0,1,2);def(5,0,2,2);def(6,0,2,3);def(7,0,3,3);
for(const op of [16,17,18,19,20,21,22,24,25,26,28,29,30,32,33,34])def(op,0,2,1);
for(const op of [23,27,64])def(op,0,1,1);
def(48,2,0,0);def(49,2,1,0);def(50,2,1,0);def(51,2,0,0);def(52,0,0,0);
def(65,0,2,0);def(80,0,1,0);def(81,0,1,0);def(82,0,0,1);def(83,0,1,0);

function run(p,input){
  const s=new Int32Array(256),mem=new Int32Array(256),calls=new Int32Array(64);
  const out=Buffer.alloc(65536);
  let sp=0,cp=0,pc=0,ip=0,len=0,code=10;
  execution:for(let step=0;step<1000000;step++){
    if(pc<0||pc>=p.length){code=9;break;}
    const op=p[pc],m=meta[op];
    if(m===null){code=5;break;}
    const [imm,pop,push]=m;
    if(pc+imm>=p.length){code=9;break;}
    if(sp<pop){code=2;break;}
    if(sp-pop+push>256){code=3;break;}
    pc+=1+imm;
    let a=s[sp-2],b=s[sp-1],r=0;
    if(pop===2&&push===1){
      if(op>=19&&op<=22&&b===0){code=4;break;}
      switch(op){
        case 16:r=a+b;break;
        case 17:r=a-b;break;
        case 18:r=Math.imul(a,b);break;
        case 19:r=a/b;break;
        case 20:r=a%b;break;
        case 21:r=Math.floor((a>>>0)/(b>>>0));break;
        case 22:r=(a>>>0)%(b>>>0);break;
        case 24:r=a&b;break;
        case 25:r=a|b;break;
        case 26:r=a^b;break;
        case 28:r=a<<b;break;
        case 29:r=a>>b;break;
        case 30:r=a>>>b;break;
        case 32:r=+(a===b);break;
        case 33:r=+(a<b);break;
        case 34:r=+((a>>>0)<(b>>>0));break;
      }
      s[--sp-1]=r|0;
      continue;
    }
    switch(op){
      case 0:code=0;break execution;
      case 1:s[sp++]=p[pc-1]<<24>>24;break;
      case 2:s[sp++]=p[pc-4]|p[pc-3]<<8|p[pc-2]<<16|p[pc-1]<<24;break;
      case 3:sp--;break;
      case 4:s[sp++]=b;break;
      case 5:s[sp-2]=b;s[sp-1]=a;break;
      case 6:s[sp++]=a;break;
      case 7:r=s[sp-3];s[sp-3]=a;s[sp-2]=b;s[sp-1]=r;break;
      case 23:s[sp-1]=-b;break;
      case 27:s[sp-1]=~b;break;
      case 48:case 49:case 50:
        r=(p[pc-2]|p[pc-1]<<8)<<16>>16;
        if(op!==48)sp--;
        if(op===48||(op===49?b===0:b!==0))pc+=r;
        break;
      case 51:
        if(cp===64){code=7;break execution;}
        calls[cp++]=pc;pc=p[pc-2]|p[pc-1]<<8;break;
      case 52:
        if(cp===0){code=8;break execution;}
        pc=calls[--cp];break;
      case 64:case 65:
        if(b<0||b>255){code=6;break execution;}
        if(op===64)s[sp-1]=mem[b];else{mem[b]=a;sp-=2;}
        break;
      case 80:{
        const text=String(b);
        if(len+text.length>65536){code=11;break execution;}
        len+=out.write(text,len,'ascii');sp--;break;
      }
      case 81:
        if(len===65536){code=11;break execution;}
        out[len++]=b&255;sp--;break;
      case 82:s[sp++]=ip<input.length?input[ip++]:-1;break;
      case 83:code=b&255;break execution;
    }
  }
  return {stdout:out.subarray(0,len),exit:code};
}

for(const id of readdirSync('/input').sort()){
  const r=run(readFileSync('/input/'+id+'/program.bin'),readFileSync('/input/'+id+'/input.bin'));
  const dir='/output/'+id;
  mkdirSync(dir,{recursive:true});
  writeFileSync(dir+'/stdout.bin',r.stdout);
  writeFileSync(dir+'/exit.txt',String(r.exit));
}
