/**
 * /assets/tests/scenes/navbar.js
 * 
 * library's navbar testing scene.
 * Scene will be loaded before tests framework and
 * wrapper for integration before scanning.
 * 
 * @author		Belikhun
 * @version		1.0
 * @license		MIT
 * @copyright	2018-2022 Belikhun
 */

/** @type {ScenesTree} */
tests.scenes.navbar = {
	name: "Navigation Bar",
	classes: "gray",

	main: {
		name: "Main Tests",

		store: {
			node: undefined,
			instance: undefined,

			title: undefined,
			switch: undefined,
			switches: [],

			iconButtons: [],
			subwindow: undefined
		},

		setup(group) {
			this.store.node = document.createElement("div");
			this.store.node.style.position = "absolute";

			group.field.appendChild(this.store.node);
			navbar.init(this.store.node);
		},

		dispose() {
			// Uninit navbar
			navbar.container = undefined;
			navbar.block.left = undefined;
			navbar.block.middle = undefined;
			navbar.block.right = undefined;
			navbar.instances = []
			navbar.subWindowLists = []
		},

		"add title"(step) {
			if (this.store.title) {
				navbar.insert(this.store.title, "left");
				return step.SKIPPED;
			}

			this.store.title = navbar.title({
				icon: `https://img.favpng.com/14/1/17/computer-icons-png-favpng-WnFp1ghSUbNp7Es4gtQY7PZBe.jpg`,
				title: "navbar",
				tooltip: {
					title: "title",
					description: "click to get more information!"
				}
			});

			navbar.insert(this.store.title, "left");
		},

		"add switches"(step) {
			if (this.store.switch) {
				navbar.insert(this.store.switch, "left");
				return step.SKIPPED;
			}

			this.store.switch = navbar.switch({ color: "whitesmoke" });
			this.store.switches = [
				this.store.switch.button({
					icon: "home",
					tooltip: {
						title: "home",
						description: "sample switch component!"
					}
				}),

				this.store.switch.button({
					icon: "table",
					tooltip: {
						title: "table",
						description: "sample switch component!"
					}
				}),

				this.store.switch.button({
					icon: "clock",
					tooltip: {
						title: "clock",
						description: "sample switch component!"
					}
				})
			]

			this.store.switches[0].click.active = true;
			navbar.insert(this.store.switch, "left");
		},

		"add icon buttons"(step) {
			if (this.store.iconButtons.length > 0) {
				for (let btn of this.store.iconButtons)
					navbar.insert(btn, "right");

				return step.SKIPPED;
			}

			this.store.iconButtons = [
				navbar.iconButton({
					icon: "chart",
					color: "whitesmoke",
					tooltip: {
						title: "icon button",
						description: "click to toggle me!"
					}
				}),

				navbar.iconButton({
					icon: "upload",
					color: "whitesmoke",
					tooltip: {
						title: "icon button",
						description: "click to toggle me!"
					}
				}),
				
				navbar.iconButton({
					icon: "book",
					color: "blue",
					tooltip: {
						title: "icon button",
						description: "but with different color!"
					}
				}),
				
				navbar.iconButton({
					icon: "save",
					color: "green",
					tooltip: {
						title: "icon button",
						description: "but with different color!"
					}
				})
			]
			
			for (let btn of this.store.iconButtons)
				navbar.insert(btn, "right");
		},

		"setup subwindow"(step) {
			if (this.store.subwindow)
				return step.SKIPPED;

			let swNode = document.createElement("div");
			swNode.classList.add("grid", "center");
			swNode.style.width = "400px";
			swNode.style.height = "200px";
			swNode.innerText = "navbar subwindow!";

			this.store.subwindow = new navbar.SubWindow(this.store.iconButtons[0].container, swNode, "blue");
			this.store.iconButtons[0].click.setHandler(() => this.store.subwindow.toggle());
		},

		"active second switch"() {
			this.store.switches[1].click.active = true;
		},

		"first and third switch is not active"(step) {
			step.AssertEqual("first", this.store.switches[0].click.active, false);
			step.AssertEqual("third", this.store.switches[2].click.active, false);
		},

		async "click all icon buttons"() {
			for (let btn of this.store.iconButtons) {
				btn.click.clickBox.click();
				await delayAsync(100);
			}
		},

		async "tooltip should show on deactivated buttons"(step) {
			this.store.switches[0].button.dispatchEvent(new Event("mouseenter"));
			step.AssertEqual("showing", this.store.switches[0].navtip.showing, true);

			await delayAsync(200);
			this.store.switches[0].button.dispatchEvent(new Event("mouseleave"));
		},

		async "tooltip should hide on activated buttons"(step) {
			this.store.iconButtons[3].container.dispatchEvent(new Event("mouseenter"));
			step.AssertEqual("showing", this.store.iconButtons[3].navtip.showing, false);

			await delayAsync(200);
			this.store.iconButtons[3].container.dispatchEvent(new Event("mouseleave"));
		},

		async "click all icon buttons again"() {
			for (let btn of this.store.iconButtons) {
				btn.click.clickBox.click();
				await delayAsync(100);
			}
		}
	}
}