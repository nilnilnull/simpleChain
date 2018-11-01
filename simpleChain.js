
const BlockchainClass = require('./Classes/Blockchain.js')

const bodyParser = require('body-parser');
const express = require('express')
const app = express()
const port = 8000;
app.use(bodyParser.json())

let validationWindowRegistry = {} // object to hold wallet/timestamp pairs to validate requests


/* ===== API Routes ==========================*/

app.get('/block/:block', (req, res) => {

	// get current instance of blockchain
	let blockChain = new BlockchainClass.Blockchain()

	// get block
	blockChain.getBlock(req.params.block)
		.then(block => {
			res.send(block) // reply with block
		})
		.catch(error => {
			res.send(`There was an error retrieving the requested block. Please review the following error message:\n${error.message}`) // in case of error, reply with error message
		})
})

app.post('/block', (req, res) => {

	// get current instance of blockchain
	let blockChain = new Blockchain()

	if (req.body.content) {
		blockChain.addBlock(new BlockClass.Block(req.body.content))
			.then(block => res.send(block))
			.catch(error => res.send(error.message))
	} else {
		res.send('Please provide a content field inside the body payload to produce a valid block.')
	}
})


app.post('/requestValidation', (req, res) => {

	if (req.body.walletAddress) {

		let walletAddress = req.body.walletAddress;
		let timestamp = Math.round(new Date().getTime()/1000)

		// check if there is a valid request already (timestamp exsist for address and it is less than 500 seconds old)
		if (validationWindowRegistry[walletAddress] &&  (timestamp - validationWindowRegistry[walletAddress]) < 500) {
			let timeLeft = 500 - (timestamp - validationWindowRegistry[walletAddress])
			res.send(`Your validation request for ${walletAddress} has ${timeLeft} seconds left. Please provide a valid signature to /message-signature/validate for the following message: ${walletAddress}:${validationWindowRegistry[walletAddress]}:starRegistry`)
		} else {

			// if there is not valid request, create a new one
			let response = {
				address: walletAddress,
				requestTimestamp: timestamp,
				message: `${walletAddress}:${timestamp}:starRegistry`,
				validationWindow: `Remaining time: 500 seconds`
			}
			validationWindowRegistry[walletAddress] = timestamp
			res.send(response)
		}
	} else {
		res.send('Please provide a walletAddress field inside the body payload to request access to the notary service.')
	}
})

app.post('/message-signature/validate', (req, res) => {

	// check if body has necessary input
	if (req.body.walletAddress && req.body.messageSignature) {

		// pull data from request and generate signature to check against
		let walletAddress = req.body.walletAddress
		let messageSignature = req.body.messageSignature
		let signatureToValidate = SHA256(`${walletAddress}:${validationWindowRegistry[walletAddress]}:starRegistry`).toString()
		let timeLeft = Math.round(500 - ((new Date().getTime()/1000) - validationWindowRegistry[walletAddress]))

		// if signature is valid
		if (signatureToValidate == messageSignature) {
			let success = {
				registerStar: true,
				status: {
					address: walletAddress,
					requestTimeStamp: validationWindowRegistry[walletAddress],
					message: `${walletAddress}:${validationWindowRegistry[walletAddress]}:starRegistry`,
					validationWindow: timeLeft,
					messageSignature: 'valid'
				}	
			}
			res.send(success)
		} else { // signature is invalid

			// check if we have a valid address (with active request)
			if (validationWindowRegistry[walletAddress]) { 
				res.send(`Signature invalid. Please sign the following message: ${walletAddress}:${validationWindowRegistry[walletAddress]}:starRegistry`)	
			} else { // direct user to create a request 
				res.send('Your wallet address does not have a valid request pending. Please generate a request using /requestValidation')
			}	
		}
	} else { // request did not provide walletAddress and messageSignature fields
		res.send('Please provide a walletAddress and messageSignature field to validate your signature.')
	}
})

app.listen(port, () => console.log(`app listening on port ${port}!`))

/* ===== TESTS ==========================*/

let bchain = new BlockchainClass.Blockchain();

// (function theLoop (i) {
//     setTimeout(function () {
//         let blockTest = new BlockClass.Block("Test Block - " + (i + 1));
//         bchain.addBlock(blockTest).then((result) => {
//             console.log(result);
// 						console.log('\n\n\n')
//             i++;
//             if (i < 10) theLoop(i);
//         });
//     }, 3000);
//   })(0);

// bchain.addBlock(new BlockClass.Block('satoshi - 2009')).then(newBlock => { console.log(`new block has been added!`)}).catch(error => console.log(error))
// bchain.getBlock(0).then(block => console.log(`Block retreived: \n`, block)).catch(error => console.log(error))
// bchain.getBlockHeight().then(height => console.log(`Block height is: ${height}`)).catch(error => console.log(error))
// bchain.validateBlockAtHeight(0).then(success => console.log(`Block was validated: ${success}`)).catch(error => console.log(error))
// bchain.validateChain().then(success => console.log(`Chain was validated: ${success}`)).catch(error => console.log(error))
