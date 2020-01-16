window.onload = function() {
  document.getElementById("gen-start").onclick = start;
  document.getElementById("gen-stop").onclick = stop;
};


function show(w) {
  document.getElementById('data').innerHTML+=w['address']+' ||||||||||||||||||||| '+w['mnemonic']+'<br>'
}

function getPerfectMatch() {
  var wallet = minterWallet.generateWallet();
  wallet['address'] = wallet.getAddressString();
  count++

  address = wallet['address'].slice(2)
  
  if (address.slice(-4)[0]==address.slice(-4)[1] && address.slice(-4)[1]==address.slice(-4)[2] && address.slice(-4)[2]==address.slice(-4)[3]) {show(wallet); console.log(wallet)}
  if (address[0]==address[1] && address[1]==address[2] && address[2]==address[3]) {show(wallet); console.log(wallet)}
  if (!isNaN(Number(address))) {show(wallet); console.log(wallet)}

  if (address[0]=='a') {document.getElementById('count').innerHTML = count}
  if (run) {
    setTimeout(getPerfectMatch, 1);
  }
}


function start() {

  run = true
  count = 0
  getPerfectMatch()

}

function stop() {
  run=false
}

