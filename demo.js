let button = createButton("Square Button");

let button2 = createButton("Square Button", {
	color: "green",
	complex: true
});

let button3 = createButton("Round Button", {
	color: "purple",
	style: "round",
	complex: true
});

let button4 = createButton("Round Button", {
	icon: "clock",
	color: "red",
	style: "round",
	complex: true
});

let button5 = createButton("Loading", {
	color: "yellow",
	style: "round",
	complex: true,
	icon: "e"
});

button5.loading(true);

btnContainer.append(button, button2, button3, button4, button5);

let input = createInput();
let input2 = createInput({
	label: "Credit Card Number",
	type: "number"
});
inputContainer.append(input.group, input2.group);

checkboxContainer.append(...[
	createCheckbox({
		label: "Can I Hav This?",
		color: "blue"
	}).group,

	createCheckbox({
		label: "",
		color: "blue"
	}).group,

	createCheckbox({
		label: "",
		color: "pink"
	}).group,

	createCheckbox({
		label: "",
		color: "pink"
	}).group
]);

switchContainer.append(...[
	createSwitch({

	}).group,
	createSwitch({
		label: ""
	}).group,
	createSwitch({
		label: "",
		color: "pink"
	}).group,
	createSwitch({
		label: "",
		color: "pink"
	}).group,
]);

sliderContainer.append(...[
	createSlider({
		color: "blue"
	}).group,
	createSlider({
		color: "pink"
	}).group,
])

selectContainer.append(...[
	createSelectInput({
		options: {
			o1: "Option 1"
		},
		value: "o1"
	}).group,
	createSelectInput({
		options: {
			o1: "Option 1"
		},
		value: "o1"
	}).group,
	createSelectInput({
		options: {
			o1: "Option 1",
			o2: "Option 2",
			o3: "Option 3",
			how: "How Many Do You Want???"
		},
		color: "pink",
		value: "o1"
	}).group,
]);

choiceContainer.append(...[
	createChoiceInput({
		color: "blue",
		choice: {
			choice1: {
				icon: "clock",
				title: "Choice 1"
			},
			choice2: {
				icon: "home",
				title: "Choice 2"
			},
			choice3: {
				icon: "key",
				title: "Choice 3"
			},
			choice4: {
				icon: "question",
				title: "Choice 4"
			},
		}
	}).container,
	createChoiceInput({
		color: "pink",
		choice: {
			choice1: {
				icon: "server",
				title: "Choice 1"
			},
			choice2: {
				icon: "externalLink",
				title: "Choice 2"
			},
			choice3: {
				icon: "pencil",
				title: "Choice 3"
			},
			choice4: {
				icon: "userLock",
				title: "Choice 4"
			},
		}
	}).container
]);

note1Container.append(...[
	createNote({
		level: "info",
		message: "Hello World!"
	}).group,
	createNote({
		level: "warning",
		message: "Hello World!"
	}).group,
	createNote({
		level: "error",
		message: "Hello World!"
	}).group,
	createNote({
		level: "okay",
		message: "Hello World!"
	}).group,


])

note2Container.append(...[
	createNote({
		level: "info",
		message: "Hello World!",
		style: "round"
	}).group,
	createNote({
		level: "warning",
		message: "Hello World!",
		style: "round"
	}).group,
	createNote({
		level: "error",
		message: "Hello World!",
		style: "round"
	}).group,
	createNote({
		level: "okay",
		message: "Hello World!",
		style: "round"
	}).group,


])

progressContainer.append(...[
	createProgressBar({
		progress: 50,
		left: "50%"
	}).group,
	createProgressBar({
		progress: 30,
		color: "green",
		style: "round",
		warningZone: 20
	}).group,
])

tooltip.init();
var interval = null;

tooltip.addHook({
	on: "dataset",
	key: "nicevalue",
	handler: ({
		target,
		value,
		update
	}) => {
		clearInterval(interval);
		value = parseInt(value);

		interval = setInterval(() => {
			update(value += 1);
		}, 200);

		return value;
	},

	destroy: () => {
		clog("DEBG", "destroyed");
		clearInterval(interval);
	}
});

var timeInt = null;

tooltip.addHook({
	on: "attribute",
	key: "currenttime",
	handler: ({
		target,
		value,
		update
	}) => {
		timeInt = setInterval(() => {
			let now = new Date();
			update(humanReadableTime(now, {
				beautify: true,
				alwayShowSecond: true
			}));
		}, 1000)

		return "bla";
	},

	destroy: () => {
		clearInterval(timeInt);
	}
})

wavec.init(waveccc);
let waveTest = new wavec.Container();
waveTest.content = "wave container";

let waveTog = createButton("toggle");
let popupBtn = createButton("popup");
waveTog.addEventListener("click", () => {
	waveTest.toggle();
})

document.body.insertBefore(waveTog, wavec.container);

popup.init();
popupBtn.addEventListener("click", () => {
	popup.show({
		buttonList: {
			button1: {
				text: "Button 1",
				complex: true,
				color: "blue"
			},
			button2: {
				text: "Button 2",
				complex: true,
				color: "green"
			},
			button3: {
				text: "Button 3",
				complex: true,
				color: "yellow"
			},
			button4: {
				text: "full width button!",
				complex: true,
				color: "orange",
				full: true
			},
		}
	});
})

new Scrollable(scrollTest, {
	content: `<div class="scrollTest">scrollable! with scroll damping</div>`
});

smenu.init(smenuTest, {
	title: "settings",
	description: "sample settings menu!"
});

let firstGroup = new smenu.Group({
	icon: "info",
	label: "owo"
});

let abcChild = new smenu.Child({
	label: "notice?"
}, firstGroup);

new smenu.components.Note({
	level: "warning",
	message: "sample note!"
}, abcChild);

let testGroup = new smenu.Group({
	icon: "exclamation",
	label: "nice group!"
})

let testComponentsChild = new smenu.Child({
	label: "components"
}, testGroup);

new smenu.components.Button({
	label: "sample button!",
	complex: true
}, testComponentsChild);

let spanelToggle = new smenu.components.Button({
	label: "with icon (and SubPanel)!",
	color: "pink",
	icon: "home",
	complex: true
}, testComponentsChild);

let sSubPanel = new smenu.Panel(`setting subpanel!`, {
	size: "small"
});
sSubPanel.setToggler(spanelToggle);

new smenu.components.Checkbox({
	label: "Dark Mode"
}, testComponentsChild)

new smenu.components.Choice({
	label: "Method",
	choice: {
		choice1: {
			icon: "server",
			title: "Choice 1"
		},
		choice2: {
			icon: "externalLink",
			title: "Choice 2"
		},
		choice3: {
			icon: "pencil",
			title: "Choice 3"
		},
		choice4: {
			icon: "userLock",
			title: "Choice 4"
		},
	},
	defaultValue: "choice1"
}, testComponentsChild)

new smenu.components.Select({
	label: "Choose Your Theme",
	options: {
		monakai: "Monakai Dark",
		material: "Material Dark",
		onedark: "One Dark Pro",
		default: "Default"
	},
	defaultValue: "default"
}, testComponentsChild)

new smenu.components.Slider({
	label: "Volume",
	min: 0,
	max: 100,
	step: 1,
	unit: "banana",
	defaultValue: 30
}, testComponentsChild);

new smenu.components.Textbox({
	label: "just a simple text box",
	value: ""
}, testComponentsChild)

let footerGroup = new smenu.Group({
	icon: "home",
	label: "about us!"
})

let footerChild = new smenu.Child({
	label: "footer"
}, footerGroup);

new smenu.components.Footer({
	icon: "https://img.favpng.com/14/1/17/computer-icons-png-favpng-WnFp1ghSUbNp7Es4gtQY7PZBe.jpg",
	appName: "Belikhun/libraries",
	version: "1.0.0"
}, footerChild)

let smenuBtn = createButton("smenu");
smenu.setToggler(smenuBtn);

document.body.insertBefore(popupBtn, smenu.container);
document.body.insertBefore(smenuBtn, smenu.container);

navbar.init(navbarTest);

let navTitle = navbar.title({
	icon: `https://img.favpng.com/14/1/17/computer-icons-png-favpng-WnFp1ghSUbNp7Es4gtQY7PZBe.jpg`,
	title: "navbar",
	tooltip: {
		title: "title",
		description: "click to get more information!"
	}
})

let navSwitch = navbar.switch({
	color: "dark"
});



let home = navSwitch.button({
	icon: "home",
	tooltip: {
		title: "home",
		description: "sample switch component!"
	}
})

home.click.active = true;

navSwitch.button({
	icon: "table",
	tooltip: {
		title: "table",
		description: "sample switch component!"
	}
})

navSwitch.button({
	icon: "clock",
	tooltip: {
		title: "clock",
		description: "sample switch component!"
	}
})

let navIcon1 = navbar.iconButton({
	icon: "chart",
	color: "dark",
	tooltip: {
		title: "icon button",
		description: "click to toggle me!"
	}
})

let navIcon2 = navbar.iconButton({
	icon: "upload",
	color: "dark",
	tooltip: {
		title: "icon button",
		description: "click to toggle me!"
	}
})

let navIcon3 = navbar.iconButton({
	icon: "book",
	color: "purple",
	tooltip: {
		title: "icon button",
		description: "but with different color!"
	}
})

let navIcon4 = navbar.iconButton({
	icon: "save",
	color: "red",
	tooltip: {
		title: "icon button",
		description: "but with different color!"
	}
})

let navSubWindow = new navbar.SubWindow(navIcon1.container, "blue");
navSubWindow.content = `<div class="navSubWindow">navbar subwindow!</div>`;
navIcon1.click.setHandler(() => navSubWindow.toggle());

navbar.insert(navTitle, "left");
navbar.insert(navSwitch, "left");
navbar.insert(navIcon1, "right");
navbar.insert(navIcon2, "right");
navbar.insert(navIcon3, "right");
navbar.insert(navIcon4, "right");

new Editor(editorTest, {
	value: `// program to check if a number is prime or not

// take input from the user
const number = parseInt(prompt("Enter a positive number: "));
let isPrime = true;

// check if number is equal to 1
if (number === 1) {
	console.log("1 is neither prime nor composite number.");
}

// check if number is greater than 1
else if (number > 1) {

	// looping through 2 to number-1
	for (let i = 2; i < number; i++) {
		if (number % i == 0) {
			isPrime = false;
			break;
		}
	}

	if (isPrime) {
		console.log(\`\${number} is a prime number\`);
	} else {
		console.log(\`\${number} is a not prime number\`);
	}
}

// check if number is less than 1
else {
	console.log("The number is not a prime number.");
}`,
	language: "js"
});