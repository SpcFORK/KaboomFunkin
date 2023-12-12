// KaboomFunkin' - A Funkin' Clone in Kaboom.js
// © SpcFORK 2023 

import kaboom from "kaboom"
import "kaboom/global"

import SML from "./MLtoJSON"
import bm_ from "./weekParser"
import quickEvent from "./quickEvent"

// initialize context
kaboom({
  background: [134, 135, 247],
  width: 600,
  height: 500,
  scale: 1.2,
});

// ---

interface SOUNDSi {
  menuMusic
}

const
  GLOBAL_LOADED_FILES: {
    txts: string,
    RIGHTTOPTEXTCHOICES: object | string,
    WEEKLIST: object | string,
    WEEKSONGS: object | string,
  } = {
    txts: '',
    RIGHTTOPTEXTCHOICES: {},
    WEEKLIST: {},
    WEEKSONGS: {},
  },
  SOUNDS: SOUNDSi = {
    menuMusic: null
  },
  SUPERCOMMONCOLOUR = [248, 206, 86],
  IS_IFRAME = (window.location !== window.parent.location),
  // WEEKS = {},
  MOD_SYMBOL = Symbol.for('MOD')

{
  /* 
  INJECTOR PREPARATION
  */
  
  [
    'WEEK_INJECTOR',
    'FREEPLAY_INJECTOR'
  ]
    .map((x) => {
      window[x] = {}
    })
}

let CHROMEOS_FIX = !navigator.userAgent.includes('CrOS')


// ---


{
  // @Preload
  loadSpriteAtlas("sprites/game/characters/beanfriend.png", {
    bean: {
      x: 0,
      y: 0,
      width: 96 * 5,
      height: 76 * 5,
      sliceX: 5,
      sliceY: 5,
      anims: {
        none: { from: 0, to: 0, loop: true, },
        idle: { from: 0, to: 4, loop: true },
        left: { from: 5, to: 8, loop: false },
        down: { from: 9, to: 12, loop: false },
        up: { from: 13, to: 16, loop: false },
        right: { from: 17, to: 20, loop: false },
      },
    }
  });

  loadSpriteAtlas("sprites/game/characters/Ghosty.png", {
    ghosty: {
      x: 0,
      y: 0,
      width: 72 * 2,
      height: 80 * 2,
      sliceX: 2,
      anims: {
        none: { from: 0, to: 0, loop: true, },
        idle: { from: 0, to: 1, loop: true },
      }
    }
  })

  loadFont("dcll", "/fonts/font.ttf")

  load(new Promise(async (resolve, reject) => {
    let txts = await fetch('code/txt.txt').then(res => res.text())
    GLOBAL_LOADED_FILES.txts = txts

    // let Weeks = await fetch('weeks/storyweeks.xml')
    //   .then(res => res.text())
    //   .then(res => {
    //     return SML.MLtoJSON(res, 'text/xml')
    //   })

    GLOBAL_LOADED_FILES.WEEKLIST = await bm_.getStoryWeeks()

    let weeklist = Object.entries(GLOBAL_LOADED_FILES.WEEKLIST)

    for (let week of weeklist) {
      let weekName = week[0]
      let weekData = week[1]
      let weekTopText = weekData.topright
      let weekSongs = weekData.songs
      if (weekTopText) GLOBAL_LOADED_FILES.RIGHTTOPTEXTCHOICES[weekName] = weekTopText
      if (weekSongs) GLOBAL_LOADED_FILES.WEEKSONGS[weekName] = Object.values(weekSongs)
    }

    resolve(txts)
  }))

  loadSprite('menu_logo', 'sprites/menu/menu.png')

  loadSprite('kaboom', 'sprites/ka.png')

  loadSprite(
    'kaboom_bg',
    'sprites/boom.png'
  )

  loadSprite('cowing', 'cowingWhite.png')

  loadSound('freakyMenu', 'sounds/freakyMenu.ogg')
  loadSound('confirmMenu', 'sounds/confirmMenu.ogg')
  loadSound('cancelMenu', 'sounds/cancelMenu.ogg')
  loadSound('scrollMenu', 'sounds/scrollMenu.ogg')

}


// ---


function createBeatHandler() {
  let lastBeatTime = 0;

  return {
    activateBeat: function(bpm) {
      const beatInterval = 60000 / bpm;
      let currentTime = time(); // Kaboom's time() function returns the current game time in seconds
      if (currentTime - lastBeatTime > beatInterval / 1000) { // Convert beatInterval to seconds
        lastBeatTime = currentTime;
        return true;
      } else {
        return false;
      }
    }
  };
}

function segPosCenter(pos: number, divs: number, width: number, ind: number) {
  return (pos / divs) * ind + (width / 2);
}

function When(conditionFunction, actionFunction) {
  return new Promise((resolve, reject) => {
    if (typeof conditionFunction !== 'function') {
      reject(new Error('Arg 1; MUST BE FUNCTION!!!'));
      return
    }

    const interval = setInterval(() => {
      let cond = conditionFunction()
      if (cond) {
        clearInterval(interval);
        actionFunction?.();
        resolve(true);
      }
    }, 100); // Check the condition every 100 milliseconds.
  });
}


async function sleep(ms) {
  return await new Promise<any>(resolve => setTimeout(resolve, ms));
}

function msToS(ms) {
  return ms / 1000;
}

function sToMs(s) {
  return s * 1000;
}


async function drainOpacity(sprite, duration: number): Promise<void> {
  return new Promise((resolve) => {
    sprite.use(opacity(1));
    let currentOpacity = 1;
    const fadeAmount = 1 / (duration / 100);

    const interval = setInterval(() => {
      currentOpacity -= fadeAmount;
      if (currentOpacity <= 0) {
        sprite.use(opacity(0));
        clearInterval(interval);
        resolve();
      } else {
        sprite.use(opacity(currentOpacity));
      }
    }, 10);
  });
}


async function createFG() {
  let fg = add([
    rect(width(), height()),
    color(0, 0, 0),
  ])
  return fg
}

async function makeTransition(color?: any) {
  let fg = await createFG();
  if (color) fg.use(color)
  fg.use(opacity(0))
  fg.use(fadeIn(0.5))

  await sleep(800)

  return fg;
}

async function makeIntroTransition(color?: any) {
  let fg = await createFG()
  if (color) fg.use(color)
  await drainOpacity(fg, sToMs(2))
  fg.destroy()
  return fg;
}


function createPlayer(...args) {
  let player_ = add([
    sprite("bean", {
      anim: "idle",
    }),
    ...args,
    area(),
    body(),
    anchor('center'),
    {
      score: 0,
      misses: 0,
      combo: 0,
      combo_max: 0,
      health: 100,
    },
  ])

  quickEvent.$(['player', 'create'], {
    player: player_,
  })

  return
}

function createGhosty(...args) {
  let gh_ = add([
    sprite("ghosty", {
      anim: "idle",
      animSpeed: 0.5,
    }),
    anchor('center'),
    ...args,
  ])

  quickEvent.$(['ghosty', 'create'], {
    ghosty: gh_,
  })

  return gh_
}


function playMenuMusic() {
  let ms_ = SOUNDS.menuMusic = play("freakyMenu", {
    volume: 0.5,
    loop: true,
  })

  quickEvent.$(['menuMusic', 'play'], {
    music: ms_,
  })

  return ms_
}

function createMenuStructure() {

  let INFOTEXTCHOICES = {
    'story mode': 'Story Mode - Play the storyline!',
    'freeplay': 'Freeplay - Play any song!',
    'options': 'Options - Change your settings!',
    'quit': 'Quit - Exit the game!',
  }

  let RIGHTTOPTEXTCHOICES = GLOBAL_LOADED_FILES.RIGHTTOPTEXTCHOICES;
  let WEEKSONGS = GLOBAL_LOADED_FILES.WEEKSONGS
  // let RIGHTTOPTEXTCHOICES = {
  //   'Week 1': '"Oh, Dearest"',
  //   'Week 2': 'Ammo-less Shootout',
  //   'Week 3': 'Spookymonth',
  //   'Week 4': 'Mearest Mistake',
  //   'Week 5': 'Merry Christler',
  //   'Week 6': 'Weeb Sim 9000',
  //   'Week 7': 'Gun-F**kery',
  // }

  return {
    top: {
      bar:
        add([
          rect(width(), 40),
          pos(0, 0),
          color(0, 0, 0),
          z(- 2),
        ]),

      topLeftText:
        add([
          text('Top Left', {
            size: 20,
          }),
          pos(5, 5),
          anchor('topleft'),
          z(-2),
        ]),

      topRightText:
        add([
          text('Top Right', {
            size: 20,
          }),
          pos(width() - 5, 5),
          anchor('topright'),
          z(-2),
          { RIGHTTOPTEXTCHOICES }
        ]),
    },
    bottom: {
      bar:
        add([
          rect(width(), 200),
          pos(0, height()),
          color(0, 0, 0),
          z(-2),
          anchor('botleft')
        ]),

      infoText:
        add([
          text('Loading...', {
            size: 20,
          }),
          pos(5, height() - 5),
          anchor('botleft'),
          z(-2),
          { INFOTEXTCHOICES }
        ]),

      weekbar: () => ({
        leftText:
          /* 
          Opponent
  
          song 1
          song 2
          song 3
          ...
          */
          add([
            text('Week 1', {
              size: 20,
            }),
            pos(segPosCenter(width(), 8, 75, 1), (height() / 2) + 125),
            anchor('center'),
            z(-2),
            { WEEKSONGS }
          ]),
      })
    },
  }
}


function createEscapeHandle(ep, ...pass) {
  let a;
  return a = onKeyPress('escape', async () => {

    await makeTransition()
    await sleep(sToMs(0.5))

    go(ep, ...pass)
    a.cancel()
  })
}

// ---


class GameNavigator {
  private tab: Record<string, Function>;
  private topText: any | null;
  private navOpacity: number = 1.0;
  private displayAllTabs: boolean = false;
  private tabTexts: any[] = [];
  private currentPos: number = 0;
  private adj: number = 0;

  constructor({ tab, topText, displayAllTabs = false, adj = 0 }: { tab: Record<string, Function>; topText: any | null; displayAllTabs?: boolean, adj?: number }) {
    this.tab = tab;
    this.topText = topText;
    this.displayAllTabs = displayAllTabs;
    this.adj = adj;

    onKeyPress('left', () => this.moveBar(-1));
    onKeyPress('right', () => this.moveBar(1));
    onKeyPress('enter', () => this.enterTab());

    if (this.displayAllTabs) {
      this.showAllTabs();
    } else if (this.topText) {
      this.topText.use(opacity(this.navOpacity));
    }
  }

  private highlight() {
    const tabKeys = Object.keys(this.tab);
    this.tabTexts.find((textComp) => textComp.text === tabKeys[this.currentPos])?.use(color(YELLOW))
  }

  private moveBar(direction: number): void {
    const tabKeys = Object.keys(this.tab);
    const tabCount = tabKeys.length;
    // this.currentPos = Math.max(0, Math.min(tabCount - 1, this.currentPos + direction)) % tabCount;
    this.currentPos = (this.currentPos + direction + tabCount) % tabCount;

    // console.log(
    //   this.currentPos,
    //   tabKeys[this.currentPos],
    //   tabKeys[this.currentPos] === tabKeys[tabCount - 1]
    // )

    if (this.displayAllTabs) {
      this.tabTexts.forEach((textComp, index) => {
        textComp.unuse(textComp.text);
        textComp.text = tabKeys[(index + this.currentPos) % tabCount];
        textComp.use(textComp.text);
        textComp.use(color(WHITE));
      });

      this.highlight()

      let ev = new CustomEvent('GameNavigator:tabChange', {
        detail: {
          tab: this.tab[tabKeys[this.currentPos]],
          index: this.currentPos,
          text: tabKeys[this.currentPos],
          tabs: tabKeys,
          this: this,
        }
      });

      dispatchEvent(ev);

    } else if (this.topText) {
      this.topText.text = tabKeys[this.currentPos];
      this.updateNavOpacity(this.currentPos);
    }
  }

  private enterTab(): void {
    const tabIndex = this.currentPos;
    const tabKeys = Object.keys(this.tab);
    const currentTab = tabKeys[tabIndex];
    const tabAction = this.tab[currentTab];

    // console.log(tabAction);

    if (tabAction) {
      // Highlight the current tab text
      this.tabTexts.find((textComp) => textComp.text === currentTab)
        .use(color(225, 225 / 2, 0));

      // Execute the action associated with the tab
      if (typeof tabAction === 'function') {
        let tsr = (tabAction + '');
        if (
          (
            tsr.includes('go(')
            && !tsr.trim().startsWith('(quick) =>')
          ) || tsr.trim().startsWith('(fade) =>')
        ) {
          makeTransition().then(() => tabAction());
        }

        else if (tsr.trim().startsWith('(locked) =>')) {
          let ta = tabAction()
          if (tabAction) {
            ta?.()
          }
        }

        else {
          tabAction();
        }
      }
    }

    let ev_ = new CustomEvent('GameNavigator:enter', {
      detail: {
        tab: this.tab[currentTab],
        index: tabIndex,
        text: currentTab,
        tabs: tabKeys,
        this: this,
      }
    });

    dispatchEvent(ev_);
  }

  private updateNavOpacity(currentIndex: number): void {
    let opacityStep = 1 / Object.keys(this.tab).length;
    this.navOpacity = Math.max(0, Math.min(1, 1 - (currentIndex * opacityStep)));
    if (this.topText) {
      this.topText.use(opacity(this.navOpacity));
    }
  }

  private showAllTabs(): void {
    const tabKeys = Object.keys(this.tab);
    this.tabTexts = tabKeys.map((key, index) => add([
      text(key, {
        size: CHROMEOS_FIX ? 28 : 28 / 2,
        font: CHROMEOS_FIX ? "dcll" : undefined,
        align: "center",
      }),
      pos(width() / (tabKeys.length + 1) * (index + 1) * 2 - this.adj, height() / 2 + 75),
      anchor('center'),
      key
    ]));

    this.highlight()
  }

  public hideTabs(): void {
    if (this.displayAllTabs) {
      this.tabTexts.forEach(textComp => textComp.hidden = true);
    }
  }

  public showTabs(): void {
    if (this.displayAllTabs) {
      this.tabTexts.forEach(textComp => textComp.hidden = false);
    }
  }

  public changeTabList(newTabList: Record<string, Function>): void {
    this.tab = newTabList;
    if (this.displayAllTabs) {
      this.showAllTabs(); // Refresh the displayed tabs
    }
  }

  public disable(): void {
    this.hideTabs();
    this.tabTexts.forEach(textComp => textComp.destroy());
  }
}

class ScrollableMenu {
  // A menu which takes an object, propagates buttons, and lets you scroll up and down, each button will have a callback vaule.

  menu: Record<string, Function>;
  private pos: [number, number];
  private currentIndex: number;
  private buttons: any;
  private events: Record<string, any>;

  constructor(menu: Record<string, Function>, posit: [number, number]) {
    this.menu = menu;
    this.pos = posit;
    this.currentIndex = -1;

    this.buttons = Object.keys(this.menu).map((key, index) => add([
      text(key, {
        size: CHROMEOS_FIX ? 28 : 28 / 2,
        font: CHROMEOS_FIX ? "dcll" : undefined,
        align: "center",
      }),
      pos(width() / (Object.keys(this.menu).length + 1) * (index + 1) * 2 - this.pos[0], height() / 2 + 75),
      anchor('center'),
      key,
    ]));

    this.setColor(-1)

    this.events = this.addEvents()
  }

  scroll(amm: number): void {
    for (let i = 0; i < this.buttons.length; i++) {
      let button = this.buttons[i]

      // Go up
      button.pos.x -= amm
    }
  }

  amm(times = 1) {
    // return (width / Object.keys(this.menu).length) * times

    // Get the distance between button 1 and 2
    let dist = this.buttons[1].pos.x - this.buttons[0].pos.x
    return dist * times
  }

  setColor(index) {
    let ind = index + 1;

    let bttn = this.buttons[ind]

    // console.log(bttn, ind, this.buttons)
    bttn.color = YELLOW
  }

  revertColor() {
    for (let i = 0; i < this.buttons.length; i++) {
      let button = this.buttons[i]
      button.color = WHITE
    }
  }

  addEvents(): { up, down, enter } {
    let e1 = onKeyPress('left', () => {

      this.revertColor()

      let lastI = this.currentIndex
      this.currentIndex = Math.max(-1, Math.min(Object.keys(this.menu).length - 2, this.currentIndex - 1));

      if (this.currentIndex != lastI) {
        this.scroll(-this.amm());
      }

      this.setColor(this.currentIndex)

      let event_ = new CustomEvent('ScrollableMenu:up', {
        detail: {
          index: this.currentIndex,
          text: Object.keys(this.menu)[this.currentIndex + 1],
        }
      })

      dispatchEvent(event_)
    })

    let e2 = onKeyPress('right', () => {

      this.revertColor()

      let lastI = this.currentIndex
      this.currentIndex = Math.max(-1, Math.min(Object.keys(this.menu).length - 2, this.currentIndex + 1));

      if (this.currentIndex != lastI) {
        this.scroll(this.amm());
      }

      this.setColor(this.currentIndex)

      let event_ = new CustomEvent('ScrollableMenu:down', {
        detail: {
          index: this.currentIndex,
          text: Object.keys(this.menu)[this.currentIndex + 1],
        }
      })

      dispatchEvent(event_)
    })

    let e3 = onKeyPress('enter', () => {
      let indPlusAdder = 1 /* STATIC */
        + 1

      this.menu[Object.keys(this.menu)[this.currentIndex + 1]](this)

      let event_ = new CustomEvent('ScrollableMenu:enter', {
        detail: {
          index: this.currentIndex,
          text: Object.keys(this.menu)[this.currentIndex + 1],
        }
      })

      dispatchEvent(event_)
    })

    return {
      up: e1,
      down: e2,
      enter: e3
    }
  }

  getInd(ind) {
    return this.buttons[ind]
  }
}


// ---


var // tree 
  player,
  notes = [],
  ALLOWEDTOPLAYSOUND = false, awaitingFirstInput


// ---


scene('songLoaded', () => {

  quickEvent.$(['songLoaded', 'init'])

  player = createPlayer()

})


scene('intro', async () => {

  quickEvent.$(['intro', 'init'])

  if (IS_IFRAME) playMenuMusic()
  else awaitingFirstInput = onClick(() => {
    // Add menu music
    ALLOWEDTOPLAYSOUND = true;
    playMenuMusic()

    awaitingFirstInput.cancel()
  })

  // Set BG
  let bg = add([
    rect(width(), height()),
    color(0, 0, 0),
  ])

  await sleep(sToMs(1.5))

  let txt = add([
    text('KaboomFunkin\'', {
      size: CHROMEOS_FIX ? 58 : 58 / 2,
      font: CHROMEOS_FIX ? "dcll" : undefined,
      align: "center"
    }),
    pos(width() / 2, height() / 2),
    anchor('center')
  ])

  let cowingLogo = add([
    sprite('cowing'),
    pos(width() / 2, height() / 2),
    anchor('center'),
    scale(0.1),
  ])

  cowingLogo.hidden = true;

  let txToggle = () => txt.hidden = !txt.hidden;

  let enterPress = onKeyPress('enter', gotoMenu)

  let MENU_FLAG = false;
  function gotoMenu() {
    enterPress.cancel()
    MENU_FLAG = true;
    go('menu')
  }

  {
    await sleep(sToMs(1.5))
    txToggle()

    await sleep(sToMs(2.5))
    txToggle()

    txt.text = 'Made by\n'
    await sleep(sToMs(1))
    txt.text += 'Spectcow'

    await sleep(sToMs(1))
    txToggle()
    !MENU_FLAG && (cowingLogo.hidden = false);

    await sleep(sToMs(1))
    // txToggle()
    cowingLogo.hidden = true;
    cowingLogo.destroy()

    let ramdomchoice = GLOBAL_LOADED_FILES.txts
      .split('\n')[
      Math.floor(
        Math.random() * GLOBAL_LOADED_FILES.txts.split('\n').length
      )
    ]
      .replace('--', '\n')

    await sleep(sToMs(1))
    txToggle()
    txt.text = ramdomchoice

    txt.textSize = (

      (
        width()
        / 5
      )

      / (
        CHROMEOS_FIX
          ? 2
          : 1
      )
    )

    txt.width = (
      (
        width()
        - 200
      )
    )

    // It's mountains!! - spc

    await sleep(sToMs(2))
    txToggle()

    await sleep(sToMs(2))
  }

  !MENU_FLAG && (
    await makeTransition(color(WHITE)),
    gotoMenu()
  )

})


scene('menu', async () => {

  quickEvent.$(['menu', 'init'])

  let bpmh = createBeatHandler()

  // Set BG
  let bg = add([
    rect(width(), height()),
    color(0, 0, 0),
  ])

  let logo = add([
    sprite('menu_logo'),
    pos(width() / 2, height() / 2),
    anchor('center'),
    scale(0.5),
  ])

  let kaboomBG = add([
    sprite('kaboom_bg'),
    pos(logo.pos.x + 125, logo.pos.y + 75),
    anchor('center'),
    scale(0.5),
  ])

  let kaboomText = add([
    sprite('kaboom'),
    pos(logo.pos.x + 125, logo.pos.y + 75),
    anchor('center'),
    scale(0.5),
  ])


  let txt = add([
    text('Press Enter to Start!', {
      size: CHROMEOS_FIX ? 28 : 28 / 2,
      font: CHROMEOS_FIX ? "dcll" : undefined,
      align: "center"
    }),
    pos(logo.pos.x, logo.pos.y + 200),
    anchor('center'),
  ])

  let scl = 0.5
  let udc = onUpdate(async () => {
    if (bpmh.activateBeat(100)) {
      logo.use(
        scale(scl = 0.4)
      )
    } else {
      scl += 0.001
      logo.use(
        scale(scl)
      )
    }
  });

  let enterPress = onKeyPress('enter', async () => {
    exit__()

    let sound_ = play('confirmMenu', {
      volume: 0.5,
    })

    let transi = await makeTransition();

    await sleep(sToMs(1));
    go('selectMenu')
  })

  function exit__() {
    [
      udc,
    ].forEach((x) => x?.cancel?.())
  }

  await makeIntroTransition(color(WHITE))
})


scene('selectMenu', async () => {

  quickEvent.$(['selectMenu', 'init'])

  let tabs = createMenuStructure()

  let esc = createEscapeHandle('menu')

  tabs.top.topLeftText.text = 'Select Tab'
  tabs.top.topRightText.text = 'USE ARROW KEYS TO MOVE TABS'
  tabs.bottom.infoText.text = '(Press ENTER to select tab)'
  // tabs.top.topRightText.hidden = true;

  let nav = new GameNavigator({
    tab: {
      'Story Mode': () => go('storyMode'),
      'Freeplay': () => go('freeplay'),
      'Options': () => go('options'),
      'Credits': () => go('credits'),
      'Quit': () => console.log('quit'),
    },

    topText: null,

    displayAllTabs: true,

    adj: 95
  })

  addEventListener('GameNavigator:tabChange', (e: CustomEventInit) => {
    tabs.bottom.infoText.text = tabs.bottom.infoText
      .INFOTEXTCHOICES[(e.detail?.text + '').toLocaleLowerCase()]
      ?? '(Press ENTER to select tab)'

    let sound_ = play('scrollMenu', {
      volume: 0.5,
    })

  })

  addEventListener('GameNavigator:enter', (e: CustomEventInit) => {
    let sound_ = play('confirmMenu', {
      volume: 0.5,
    })
  })

  // Yellowish BG
  let bg = add([
    rect(width(), height()),
    color(
      SUPERCOMMONCOLOUR[0],
      SUPERCOMMONCOLOUR[1],
      SUPERCOMMONCOLOUR[2]
    ),
    z(-3),
  ])

  let bf = createPlayer(
    pos(100, height() / 2 - 75),
  )

  let ghosty = createGhosty(
    pos(width() / 2, height() / 2 - 75),
  )

  /* fadeOutSprite */
  await makeIntroTransition()
})


scene('storyMode', async () => {

  quickEvent.$(['storyMode', 'init'])

  let tabs = createMenuStructure()

  let esc = createEscapeHandle('selectMenu')

  let weekbar = tabs.bottom.weekbar()

  tabs.top.topLeftText.text = 'Select Tab'
  tabs.top.topRightText.text = 'USE ARROW KEYS TO MOVE TABS'
  tabs.bottom.infoText.destroy()

  let weeks = {
    'Week 1': () => { }, // DD vs BF
    'Week 2': () => { }, // PICO vs BF
    'Week 3': () => { }, // S&P vs BF
    'Week 4': () => { }, // MM vs BF
    'Week 5': () => { }, // DD&MM vs BF Crismah
    'Week 6': () => { }, // S vs bf
    'Week 7': () => { }, // TKM vs BF
    [MOD_SYMBOL]: { ...window['WEEK_INJECTOR'] }
  }

  Object.assign(window, {
    get WEEK_INJECTOR() {
      return weeks[MOD_SYMBOL]
    },
    set WEEK_INJECTOR(x) {
      Object.assign(weeks[MOD_SYMBOL], x || { x } || {})
    }
  })

  let menu = new ScrollableMenu(
    { ...weeks, ...weeks[MOD_SYMBOL] },
    [(-width() / 4), height() / 2 + 80]
  )

  // @ load TODO

  let switchtexts = (e: CustomEventInit) => {
    let ind: string = e.detail.text
    let txt = tabs.top.topLeftText.text = ind

    let sound_ = play('scrollMenu', {
      volume: 0.5,
    })

    console.log(weekbar.leftText.WEEKSONGS)

    tabs.top.topRightText.text = tabs.top.topRightText.RIGHTTOPTEXTCHOICES?.[ind] || ''
    weekbar.leftText.text = weekbar.leftText.WEEKSONGS?.[ind]?.join?.('\n') || ''
  }

  addEventListener('ScrollableMenu:up', switchtexts)
  addEventListener('ScrollableMenu:down', switchtexts)

  addEventListener('ScrollableMenu:enter', (e: CustomEventInit) => {
    let sound_ = play('confirmMenu', {
      volume: 0.5,
    })
  })

  await makeIntroTransition()

})





// ---


// Start the game scene
go('intro');