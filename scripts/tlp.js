async function writeTLPMessage(tab, color){
	var details = await browser.compose.getComposeDetails(tab.id);
	
	var subject = details.subject;
	var new_subject = getSubjectMessage(color, subject);
	var tlp_message = await getTlpMessage(color);
	console.log(tlp_message);
	
	if(details.isPlainText){
		var key = "plainTextBody";
		var message = details.plainTextBody;
		var new_message = getBodyTextMessage(color, message, tlp_message);
	} else {
		var key = "body";
		var message = details.body;
		var new_message = getBodyHtmlMessage(color, message, tlp_message);
	}
	

	// browser.compose.setComposeDetails(tab.id, {subject: new_subject, [key]: new_message});
	browser.compose.setComposeDetails(tab.id, {subject: new_subject, [key]: new_message});


	var tmp=await browser.composeMessageHeaders.getComposeHeader(tab.id, 'msip_labels');
	console.log(tmp);

	browser.composeMessageHeaders.addComposeHeader(tab.id, 'msip_labels', 'MSIP_Label_0f96f430-67b6-4e1b-a859-01e2f7289cb5_Enabled=true; MSIP_Label_0f96f430-67b6-4e1b-a859-01e2f7289cb5_Name=TLP GREEN; MSIP_Label_0f96f430-67b6-4e1b-a859-01e2f7289cb5_SiteId=d1135ac0-62ba-486d-99f3-2d594846b942;');


	var tmp=await browser.composeMessageHeaders.getComposeHeader(tab.id, 'msip_labels');
	console.log(tmp);

	var used = true;
	var tabId = tab.id;
	browser.runtime.sendMessage({ tabId,  used});
}

function getSubjectMessage(color, subject){
	var array_subjects = getArraySubjects();
	var message = array_subjects[color];
	var new_subject = subject;
	
	var start = subject.indexOf("[TLP:");
	var end = subject.indexOf("]");
	if(end !== -1){
		end = end+1;
	}
	
	// se start è -1 vuol dire non lo ha trovato
	// se start è 0 significa che lo sto modificando al momento
	// se start è >0 significa è nel messaggio e lo modifico solo se il colore è diverso
	if(start === -1){
		if(color !== "NONE"){
			new_subject = message+" "+subject;
		}
	}else{
		if(start === 0){
			subject = subject.substr(end+1); // includo lo spazio
		}
		if(color !== "NONE" && subject.indexOf(message) === -1){
			subject = message+" "+subject;
		}
		new_subject = subject;
	}
	new_subject = "";
	return new_subject;
}

function getBodyTextMessage(color, message,tlp_message){
	// cerco di capire se è presente un messaggio tulpe 
	// e lo rimuovo solo se a inizio corpo
	var start = message.indexOf("TLP:");
	if(start === 0){
		var end = message.indexOf(";", start);
		// +3 per rimuovere anche ;\n
		message = message.substr(end+3);
	}
	if(color !== "NONE"){
		// aggiungo il ; per capire dove finisce il messaggio
		var new_message = tlp_message+";\n"+message;
	} else {
		var new_message = message;
	}
	return new_message;
}

function getBodyHtmlMessage(color, message,tlp_message){
	var array_colors = getArrayHtmlColors();
	
	// visto che è in HTML per prima cosa faccio il parse
	var temp_doc = new DOMParser().parseFromString(message, "text/html");
	
	// se trovo un messaggio tulpe come primo elemento
	// lo rimuovo, gli altri non li tocco(in caso di reply)
	var firstEl = temp_doc.body.firstElementChild;
	if(firstEl.classList.contains("tulpe-message")){
		firstEl.remove();
	}
	
	if(color !== "NONE"){
		// creo il messaggio all'interno di un paragrafo
		var el = document.createElement("p");
		el.textContent = tlp_message;
		el.style["color"] = array_colors[color];
		el.style["text-align"] = "right";
		el.style["font-weight"] = "normal";
		el.style["margin"] = "5pt";
		el.style["font-family"] = "Calibri";
		el.style["font-size"] = "10pt";
		el.className = "tulpe-message";
		
		temp_doc.body.insertBefore(el, temp_doc.body.firstChild);
	}
	
	// ritrasformo il documento ad HTML per mandarlo all'editor
    var html = new XMLSerializer().serializeToString(temp_doc);
	
	return html;
}

function getArraySubjects(){
	var array_subjects = {
		"RED"   : "[TLP:RED]",
		"AMBER" : "[TLP:AMBER]",
		"GREEN" : "[TLP:GREEN]",
		"WHITE" : "[TLP:WHITE]",
	};
	return array_subjects;
}
async function getTlpMessage(color){
	var storage_key = getStorageKey(color);
	console.log(storage_key);
	var message = await browser.storage.local.get().then((res) => {
		return res[storage_key];
	});
	var tlp_message = "TLP: "+color+message;
	return tlp_message;
}

function getStorageKey(color){
	var array_keys = {
		"RED"  : "tlp_red_message",
		"AMBER": "tlp_amber_message",
		"GREEN": "tlp_green_message",
		"WHITE": "tlp_white_message"
	};
	
	return array_keys[color];
}

function getArrayMessage(){
	var array_message = {
		"RED"  : "Classification: TLP-RED - personal for named recipients only",
		"AMBER": "Classification: TLP-AMBER - Organisation:SPE - limited distribution",
		"GREEN": "Classification: TLP-GREEN - community wide",
		"WHITE": "Classification: TLP-WHITE - unlimited, subject to copyright rules"
	};
	
	return array_message;
}

function getArrayHtmlColors(){
	var array_colors = {
		"RED"  : "#FF522F",
		"AMBER": "#FFFF00",
		"GREEN": "#5ABE47",
		"WHITE": "#5E7975"
	};
	
	return array_colors;
}
