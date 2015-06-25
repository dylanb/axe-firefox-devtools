(function (window) {
	var results, rule;

	function messageFromRelatedNodes(relatedNodes) {
		var retVal = '';
		if (relatedNodes.length) {
			retVal += '<ul>Related Nodes:';
			relatedNodes.forEach(function (node) {
				retVal += '<li><a href="javascript:;" class="related-node" data-element=\'' + JSON.stringify(node.target) + '\'>';
				retVal += node.target.join('>').replace(/</gi, '&lt;').replace(/>/gi, '&gt;');
				retVal += '</a></li>';
			});
			retVal += '</ul>';
		}
		return retVal;
	}

	function messagesFromArray(nodes) {
		var retVal = '<p class="summary"><ul class="failure-message">';
		nodes.forEach(function (failure) {
			var htmlSafeMessage = failure.message.replace(/</gi, '&lt;').replace(/>/gi, '&gt;');
			retVal += '<li>';
			retVal += htmlSafeMessage;
			retVal += messageFromRelatedNodes(failure.relatedNodes);
			retVal += '</li>';
		});
		retVal += '</ul></p>';
		return retVal;
	}

	function summary(node) {
		var retVal = '';
		if (node.any.length) {
			retVal += '<h3 class="error-title">Fix any of the following</h3>';
			retVal += messagesFromArray(node.any);
		}

		var all = node.all.concat(node.none);
		if (all.length) {
			retVal += '<h3 class="error-title">Fix all of the following</h3>';
			retVal += messagesFromArray(all);
		}
		return retVal;
	}

	window.addEventListener("message", function(event) {
	  window.port = event.ports[0];
	  window.port.start();
	  window.port.onmessage = receive;
	});

	document.addEventListener('click', function(e) {
		if (e.target.classList.contains('related-node')) {
			window.port.postMessage('{"command": "highlight", "target": ' + 
				e.target.getAttribute('data-element') + '}');
		}
		if (e.target.classList.contains('rule')) {
			details.classList.remove('empty');
			displayNodeList(parseInt(e.target.getAttribute('data-index'), 10));
			Array.prototype.slice.call(document.querySelectorAll('.rule.selected')).forEach(function (node) {
				node.classList.remove('selected');
				node.removeAttribute('title');
			});
			e.target.classList.add('selected');
			e.target.setAttribute('title', 'selected');
		}
	});

	document.addEventListener('mouseover', function (e) {
		if (e.target.classList.contains('related-node')) {
			e.target.classList.add('highlighted');
		}
		if (e.target.classList.contains('rule')) {
			e.target.classList.add('highlighted');
		}
	});

	document.addEventListener('mouseout', function (e) {
		if (e.target.classList.contains('related-node')) {
			e.target.classList.remove('highlighted');
		}
		if (e.target.classList.contains('rule')) {
			e.target.classList.remove('highlighted');
		}
	});

	document.getElementById('actions').addEventListener('click', function (e) {
		var current, max;
		if (!rule) return;
		current = parseInt(document.getElementById('currentNode').textContent, 10) - 1;
		max = parseInt(document.getElementById('nodeCount').textContent, 10);
		if (e.target.classList.contains('prev')) {
			if (current > 0) {
				current -= 1;
			}
		} else if (e.target.classList.contains('next')) {
			if (current < (max - 1)) {
				current += 1;
			}
		} else if (e.target.classList.contains('inspect')) {
			window.port.postMessage('{"command": "inspect", "target": ' + e.target.parentNode.getAttribute('data-element') + '}');
		}
		displayNodeDetails(current);
		e.stopPropagation();
	});

	document.getElementById('detailsItem').addEventListener('click', function (e) {
		if (e.target.classList.contains('inspect')) {
			window.port.postMessage('{"command": "inspect", "target": ' + e.target.parentNode.getAttribute('data-element') + '}');
			e.stopPropagation();
		} else if (e.target.classList.contains('highlight')) {
			window.port.postMessage('{"command": "highlight", "target": ' + e.target.parentNode.getAttribute('data-element') + '}');
			e.stopPropagation();
		}
	});

	var request = document.getElementById("analyze");
	var list = document.getElementById("list");
	var details = document.getElementById("details");

	request.addEventListener("click", send, false);

	function send(event) {
		list.textContent = '';
		window.port.postMessage('{"command": "analyze"}');
	}

	function receive(event) {
		results = event.data;
		if (typeof results.loaded !== 'undefined') {
			details.classList.add('empty');
			list.innerHTML = '<p>Click the "Analyze" button to analyze this page for accessibility violations.</p>';
			return;
		} else if (typeof results.refresh !== 'undefined') {
			details.classList.add('empty');
			list.innerHTML = '<p>Refresh the page</p>';
			return;
		}
		if (results.violations.length) {
			var listHTML = ''
			listHTML += '<table>';
			listHTML += '<tr>';
			listHTML += '<th scope="col">Description</th>';
			listHTML += '<th scope="col">Count</th>';
			listHTML += '<th scope="col">Impact</th>';
			listHTML += '</tr>';
			results.violations.forEach(function (rule, i) {
				// TODO: Best practices
				var impact = rule.impact;
				var help = rule.help.replace(/</gi, '&lt;').replace(/>/gi, '&gt;');
				var bestpractice = (rule.tags.indexOf('best-practice') !== -1);
				var issueHTML = ''
				issueHTML += '<tr><td class="help"><a href="javascript:;" class="rule" data-index="' + i + '">';
				issueHTML += help;
				issueHTML += '</a></td>';
				issueHTML += '<td class="count">';
				issueHTML += rule.nodes.length;
				issueHTML += '</td>';
				issueHTML += '<td class="impact">';
				issueHTML += impact;
				issueHTML += '</td>';
				issueHTML += '</tr>';
				listHTML += issueHTML;
			});
			listHTML += '</table>';
			list.innerHTML = listHTML;
		} else {
			details.classList.add('empty');
			list.innerHTML += '<p>Congratulations! No accessibility violations found. Now you should perform manual testing using assistive technologies like NVDA, VoiceOver and JAWS</p>';
		}
	}

	function displayNodeList(index) {
		rule = results.violations[index];
		document.getElementById('nodeCount').textContent = rule.nodes.length;
		displayNodeDetails(0);
		document.getElementById('actions').querySelector('button').focus();
	}

	function displayNodeDetails(nodeNumber) {
		var node = rule.nodes[nodeNumber];
		document.getElementById('currentNode').textContent = nodeNumber+1;
		document.getElementById('html').getElementsByTagName('td')[0].innerHTML = node.target[0].replace(/</gi, '&lt;').replace(/>/gi, '&gt;');
		document.getElementById('reason').getElementsByTagName('td')[0].innerHTML = summary(node);
		document.getElementById('html').getElementsByTagName('td')[1].setAttribute('data-element', JSON.stringify(node.target));
		window.port.postMessage('{"command": "highlight", "target": ' + JSON.stringify(node.target) + '}');
	}

})(this);