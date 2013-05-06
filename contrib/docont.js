var jsonp = [];

(function() {
	"use strict";

	var loader = document.getElementById("loader");

	getMembers(function(members) {
		getRepositories(function(repos) {
			var data = {};
			var reponum = repos.length;
			(function nextRepo() {
				var repo = repos.pop();
				loader.firstChild.data = "Loading... " + (reponum - repos.length - 1) + "/" + reponum;
				if (repo) {
					data[repo.name] = [];
					getContributors(repo.name, function(contributors) {
						if (Array.isArray(contributors)) {
							(function nextContributor() {
								var contributor = contributors.pop();
								if (contributor) {
									data[repo.name].push(contributor);
									nextContributor();
								} else {
									nextRepo();
								}
							}());
						} else {
							nextRepo();
						}
					});
				} else {
					loader.style.display = "none";
					drawData(members, data);
				}
			}());
		});
	});

	function github(res, callback) {
		var id = jsonp.length;
		jsonp.push(function(data) { callback(data.data); });
		var callident = "jsonp["+id+"]";
		var script = document.createElement("script");
		script.type = "text/javascript";
		script.src = "https://api.github.com" + res + "?callback=" + encodeURIComponent(callident);
		document.body.appendChild(script);
	}

	function getMembers(callback) {
		var members = {};
		github("/orgs/oftn/members", function(data) {
			for (var i = 0, len = data.length; i < len; i++) {
				members[data[i].login] = true;
			}
			callback(members);
		});
	}

	function getRepositories(callback) {
		github("/orgs/oftn/repos", callback);
	}

	function getContributors(repo, callback) {
		github("/repos/oftn/"+repo+"/contributors", callback);
	}
	
	function drawData(members, data) {
		var e = document.getElementById("container");
		var contrib;
		var users = {};

		for (var repo in data) {
			if (data.hasOwnProperty(repo)) {
				contrib = data[repo];
				for (var i = 0, len = contrib.length; i < len; i++) {
					var user = contrib[i];
					if (!members[user.login]) continue;
					if (!users.hasOwnProperty(user.login)) {
						users[user.login] = {contrib: 0, data: user};
					}
					users[user.login].contrib += user.contributions;
				}
			}
		}

		var userlist = Object.keys(users).sort(function(a, b) {
			return users[b].contrib - users[a].contrib;
		});

		var table = document.createElement("table");
		var tr = document.createElement("tr");
		var th1 = document.createElement("th");
		var th2 = document.createElement("th");
		th1.appendChild(document.createTextNode("Contributions"));
		th2.appendChild(document.createTextNode("User"));
		tr.appendChild(th1);
		tr.appendChild(th2);
		table.appendChild(tr);

		for (var i = 0, len = userlist.length; i < len; i++) {
			var tr = document.createElement("tr");
			var td1 = document.createElement("td");
			var td2 = document.createElement("td");

			var image = document.createElement("img");
			image.src = users[userlist[i]].data.avatar_url;
			image.width = image.height = 36;

			td1.appendChild(image);
			td1.appendChild(document.createTextNode(" " + userlist[i]));

			td2.appendChild(document.createTextNode(" " + users[userlist[i]].contrib));

			tr.appendChild(td2);
			tr.appendChild(td1);
			table.appendChild(tr);
		}

		e.appendChild(table);
	}

}());
