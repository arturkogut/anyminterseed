importScripts('https://unpkg.com/minterjs-wallet');

function getPerfectMatch() {
  var wallet = minterWallet.generateWallet();
  var address = wallet.getAddressString();

  var message = {
    address: address,
    mnemonic: wallet.getMnemonic(),
    match: false,
  };

  address = message['address'].slice(2)
  // address = '112609069070050978234201710692101096211'
  // if (address[0]=='a') {console.log('a')}
  
  if (address.slice(-4)[0]==address.slice(-4)[1] && address.slice(-4)[1]==address.slice(-4)[2] && address.slice(-4)[2]==address.slice(-4)[3]) {message.match = true; console.log(message)}
  if (address[0]==address[1] && address[1]==address[2] && address[2]==address[3]) {message.match = true; console.log(message)}
  if (!isNaN(Number(address))) {message.match = true; console.log(message)}


  // if ((mode === "all" && address.includes(inputValue)) || (mode === "end" && address.includes(inputValue, address.length - inputValue.length))) {
  //   message.match = true;
  // }
  postMessage(message);
}

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

self.addEventListener("message", function(e) {
  getPerfectMatch();
}, false);
