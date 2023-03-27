/**
 * /assets/tests/scenes/smenu.js
 * 
 * library's smenu testing scene.
 * Scene will be loaded before tests framework and
 * wrapper for integration before scanning.
 * 
 * @author		Belikhun
 * @version		1.0
 * @license		MIT
 * @copyright	2018-2023 Belikhun
 */

/** @type {ScenesTree} */
tests.scenes.smenu = {
	name: "Setting Menu",

	store: {
		node: undefined,
		instance: undefined,

		infoGroup: undefined,
		note: undefined,

		niceGroup: undefined,
		sPanelToggle: undefined,
		sPanel: undefined,
		bananaSlider: undefined,

		loremGroup: undefined,

		footerGroup: undefined
	},

	activate(scene) {
		this.store.node = document.createElement("div");
		this.store.node.style.position = "absolute";

		scene.field.appendChild(this.store.node);
		smenu.init(this.store.node, {
			title: "settings",
			description: "sample settings menu!"
		});

		smenu.show();
	},

	dispose() {
		this.store.infoGroup = undefined;
		this.store.niceGroup = undefined;
		this.store.loremGroup = undefined;
		this.store.footerGroup = undefined;

		smenu.container = undefined;
		smenu.groupLists = []
		smenu.initialized = false;
		smenu.hiding = true;
		smenu.collapsing = true;
		smenu.containerHideTimeout = null;
		smenu.mainHideTimeout = null;
		smenu.activePanel = null;
		smenu.showHandlers = []
		smenu.hideHandlers = []
	},

	initialize: {
		name: "Setup Components",

		"info group"(step) {
			if (this.parent.store.infoGroup)
				return step.SKIPPED;

			this.parent.store.infoGroup = new smenu.Group({
				icon: "info",
				label: "info group"
			});

			let noteChild = new smenu.Child({
				label: "setting child"
			}, this.parent.store.infoGroup);

			this.parent.store.note = new smenu.components.Note({
				level: "warning",
				message: `a neat little note!`
			}, noteChild);
		},

		"nice group!"(step) {
			if (this.parent.store.niceGroup)
				return step.SKIPPED;

			this.parent.store.niceGroup = new smenu.Group({
				icon: "exclamation",
				label: "nice group!"
			})

			let testComponentsChild = new smenu.Child({
				label: "components"
			}, this.parent.store.niceGroup);
			
			new smenu.components.Button({
				label: "sample button!",
				complex: true
			}, testComponentsChild);
			
			this.parent.store.sPanelToggle = new smenu.components.Button({
				label: "with icon (and SubPanel)!",
				color: "pink",
				icon: "home",
				complex: true
			}, testComponentsChild);

			let sPanelContent = document.createElement("div");
			sPanelContent.classList.add("grid", "center");
			sPanelContent.style.height = "100%";
			sPanelContent.innerText = "setting subpanel!";
			
			this.parent.store.sPanel = new smenu.Panel(sPanelContent, { size: "small" });
			this.parent.store.sPanel.setToggler(this.parent.store.sPanelToggle);
			
			new smenu.components.Checkbox({
				label: "Dark Mode"
			}, testComponentsChild);
			
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
			}, testComponentsChild);
			
			new smenu.components.Select({
				label: "Choose Your Theme",
				options: {
					monakai: "Monakai Dark",
					material: "Material Dark",
					onedark: "One Dark Pro",
					default: "Default"
				},
				defaultValue: "default"
			}, testComponentsChild);
			
			this.parent.store.bananaSlider = new smenu.components.Slider({
				label: "Bananas",
				min: 0,
				max: 100,
				step: 1,
				unit: "banana",
				save: "tests.smenu.banana",
				defaultValue: 30
			}, testComponentsChild);
			
			new smenu.components.Textbox({
				label: "just a simple text box",
				value: ""
			}, testComponentsChild);
		},

		"lorem"(step) {
			if (this.parent.store.loremGroup)
				return step.SKIPPED;

			this.parent.store.loremGroup = new smenu.Group({
				icon: "news",
				label: "some lorem"
			});

			let loremChild = new smenu.Child({
				label: "content"
			}, this.parent.store.loremGroup);

			new smenu.components.Text({
				content: `<h2>What is Lorem Ipsum?</h2>
						<p><strong>Lorem Ipsum</strong> is simply dummy text of the printing and
						typesetting industry. Lorem Ipsum has been the industry's standard dummy
						text ever since the 1500s, when an unknown printer took a galley of type
						and scrambled it to make a type specimen book. It has survived not only
						five centuries, but also the leap into electronic typesetting, remaining
						essentially unchanged. It was popularised in the 1960s with the release
						of Letraset sheets containing Lorem Ipsum passages, and more recently
						with desktop publishing software like Aldus PageMaker including versions
						of Lorem Ipsum.</p>`
			}, loremChild);
		},

		"footer"(step) {
			if (this.parent.store.footerGroup)
				return step.SKIPPED;

			this.parent.store.footerGroup = new smenu.Group({
				icon: "home",
				label: "about us!"
			});
			
			let footerChild = new smenu.Child({
				label: "footer"
			}, this.parent.store.footerGroup);

			new smenu.components.Text({
				content: `Why do Americans have so many different types of towels?
					We have beach towels, hand towels, bath towels, dish towels,
					camping towels, quick-dry towels, and let’s not forget paper
					towels. Would 1 type of towel work for each of these things?
					Let’s take a beach towel. It can be used to dry your hands and
					body with no difficulty. A beach towel could be used to dry
					dishes. Just think how many dishes you could dry with one beach
					towel. I’ve used a beach towel with no adverse effects while
					camping. If you buy a thin beach towel it can dry quickly too.
					I’d probably cut up a beach towel to wipe down counters or for
					cleaning other items, but a full beach towel could be used too.
					Is having so many types of towels an extravagant luxury that
					Americans enjoy or is it necessary? I’d say it's overkill and
					we could cut down on the many types of towels that manufacturers
					deem necessary.`
			}, footerChild);
			
			new smenu.components.Footer({
				icon: "https://img.favpng.com/14/1/17/computer-icons-png-favpng-WnFp1ghSUbNp7Es4gtQY7PZBe.jpg",
				appName: "Belikhun/libraries",
				version: "1.0.0"
			}, footerChild)
		}
	},

	tests: {
		name: "Tests",

		"show"() {
			smenu.show();
		},

		async "scroll to each group"() {
			for (let group of smenu.groupLists)
				await group.scrollTo();

			await smenu.groupLists[0].scrollTo();
		},

		"show smenu panel"(step) {
			this.parent.store.sPanelToggle.button.click();
			step.AssertIs("panel show", this.parent.store.sPanel.showing);
		},

		async "hide smenu panel"(step) {
			await this.parent.store.sPanel.hide();
			step.AssertIs("panel hide", !this.parent.store.sPanel.showing);
		},

		async "search should only show related results"(step) {
			smenu.filter("banana");
			await delayAsync(100);
			step.AssertIs("banana show", this.parent.store.bananaSlider.container.style.display === "");
			step.AssertIs("note hide", this.parent.store.note.container.style.display !== "");
		},

		async "everything visible when search empty"(step) {
			smenu.filter("");
			step.AssertIs("banana show", this.parent.store.bananaSlider.container.style.display === "");
			step.AssertIs("note show", this.parent.store.note.container.style.display === "");
			step.AssertIs("info group show", this.parent.store.infoGroup.container.style.display === "");
			step.AssertIs("nice group show", this.parent.store.niceGroup.container.style.display === "");
			step.AssertIs("lorem group show", this.parent.store.loremGroup.container.style.display === "");
			step.AssertIs("footer group show", this.parent.store.footerGroup.container.style.display === "");
		},

		async "values should be saved to local storage"(step) {
			let value = randBetween(0, 100, true);
			this.parent.store.bananaSlider.set({ value });
			step.AssertEqual("banana", localStorage.getItem("tests.smenu.banana"), value);
		}
	}
}