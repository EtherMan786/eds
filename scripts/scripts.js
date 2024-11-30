import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  fetchPlaceholders,
} from './aem.js';

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

function autolinkModals(element) {
  element.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');

    if (origin && origin.href && origin.href.includes('/modals/')) {
      e.preventDefault();
      const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
      openModal(origin.href);
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decoratePlaceholder(main);

}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  autolinkModals(doc);
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

export async function decoratePlaceholder(block, path) {
  try {
    const resp = await fetchPlaceholders(path);
    // return renderHelper([resp], `<div class="forName">${block.innerHTML}</div>`);
    block.querySelectorAll('*').forEach((el, index) => {
      if (el.firstChild instanceof Text) {
        Object.keys(resp).forEach((key) => {
          var value = resp[key];
          if (value && value.trim() && el.firstChild.textContent.trim() && el.firstChild.textContent.includes(`{${key}}`)) {
            console.log(el.innerHTML, " :: ", el.firstChild.textContent);
            el.innerHTML = el.firstChild.textContent.replaceAll(`{${key}}`, value);
          }
          // if (value && value.trim() && !value.includes('<') && el.firstChild.textContent.trim() && el.firstChild.textContent.includes(`{${key}}`)) {
          //   el.firstChild.textContent = el.firstChild.textContent.replaceAll(`{${key}}`, value);
          // }else {

          // }
        });
      }
    });
    return block.innerHTML;
  } catch (error) {
    console.warn(error);
  }
}

export function renderHelper(data, template, callBack) {
  const dom = document.createElement('div');
  dom.innerHTML = template;
  const loopEl = dom.getElementsByClassName('forName');
  Array.prototype.slice.call(loopEl).forEach((eachLoop) => {
    let templates = '';
    const localtemplate = eachLoop.innerHTML;
    for (const key in data) {
      if (Object.hasOwnProperty.call(data, key)) {
        const element = data[key];
        // data.forEach(function (element, index) {
        var dataItem = callBack ? callBack(element, key) : element;
        const keys = Object.keys(dataItem);
        var copyTemplate = localtemplate;
        copyTemplate.split('{').forEach((ecahKey) => {
          const key = ecahKey.split('}')[0];
          const keys = key.split('.');
          let value = dataItem;
          keys.forEach((key) => {
            if (value && value.hasOwnProperty(key)) {
              // if (key === 'data-src') {
              //   key = 'src';
              // }
              value = value[key];
            } else {
              value = '';
            }
          });
          copyTemplate = copyTemplate.replace(`{${key}}`, value);
        });
        templates += copyTemplate;
        // });
      }
    }
    eachLoop.outerHTML = templates;
  });
  return dom.innerHTML;
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
