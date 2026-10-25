/**
 * IOC — the wall of systems.
 *
 * "IOC" is Dr Non's word for the city systems: Bangkok IOC, Greater Kuching
 * IOC, the control towers, the atlases, the watch rooms. This is the list
 * of them, in the order he names them, with the address each one actually
 * answers on.
 *
 * Every URL here was checked against the live host before it was written
 * down. A wall of systems that are not there is a wall of lies, and a
 * dashboard that 404s teaches nobody anything except that the dashboard
 * is broken.
 *
 * The screenshot for each cell is a photograph of a real system, taken
 * from a real one. Where two systems share a family — the control towers
 * are one codebase with different coats of paint — they share a
 * photograph, because showing the same picture twice would be a lie about
 * the picture and a lie about the system.
 */

/** The screenshot file for each family of system. */
const SHOT = {
  control: 'screenshots/sciti.jpg',    // the control towers
  atlas:   'screenshots/cdp.jpg',      // the atlases and the data platform
  desk:    'screenshots/monitor.jpg',   // the super dashboards
  war:     'screenshots/phuket.jpg',    // the war rooms
  watch:   'screenshots/conflict.jpg',  // the watch rooms
  mem:     'screenshots/mem.jpg',       // the monitors
  kuching: 'screenshots/kuching.jpg',
  home:    'screenshots/academic.jpg',  // nonarkara.org itself
};

export const IOC = [
  { code: 'CHONBURI',  title: 'Chonburi Control Tower',   url: 'https://chonburi-control-tower.pages.dev',        shot: SHOT.control },
  { code: 'NST',       title: 'Nakhon Si Thammarat',      url: 'https://nst.nonarkara.org/',                        shot: SHOT.control },
  { code: 'BKK',       title: 'Bangkok IOC · BKK view',   url: 'https://bkk.nonarkara.org/',                        shot: SHOT.atlas },
  { code: 'ATLAS',     title: 'BKKx 3D Atlas',             url: 'https://atlas.nonarkara.org/',                      shot: SHOT.atlas },
  { code: 'YALA',      title: 'Yala Control Tower',        url: 'https://yala-control-tower.pages.dev/',             shot: SHOT.control },
  { code: 'PHUKET',    title: 'Phuket Ops · War Room',     url: 'https://phuket.nonarkara.org/war-room',             shot: SHOT.war },
  { code: 'SIKHIO',    title: 'Sikhio Town Operations',    url: 'https://sikhio.nonarkara.org/',                     shot: SHOT.control },
  { code: 'KL',        title: 'KL 3D Atlas',               url: 'https://kl.nonarkara.org',                          shot: SHOT.atlas },
  { code: 'HCMC',      title: 'HCMCx Super Dashboard',     url: 'https://hcmc.nonarkara.org',                        shot: SHOT.desk },
  { code: 'JAKARTA',   title: 'Jakarta City Dashboard',    url: 'https://jakarta.nonarkara.org',                     shot: SHOT.desk },
  { code: 'CNX',       title: 'Chiang Mai War Room',       url: 'https://cnx.nonarkara.org',                        shot: SHOT.desk },
  { code: 'LOPBURI',   title: 'Lopburi Operations',        url: 'https://lopburi.nonarkara.org/lopburi',             shot: SHOT.control },
  { code: 'GLOBAL',    title: 'Global Monitor',            url: 'https://globalmonitor.nonarkara.org/',              shot: SHOT.watch },
  { code: 'ASIA',      title: 'Asia Political Dashboard',  url: 'https://asia.nonarkara.org/',                       shot: SHOT.watch },
  { code: 'MEM',       title: 'Middle East Monitor',       url: 'https://mem.nonarkara.org/',                        shot: SHOT.mem },
  { code: 'NONARKARA', title: 'nonarkara.org',             url: 'https://nonarkara.org/',                           shot: SHOT.home },
  { code: 'KUCHING',   title: 'Greater Kuching IOC',       url: 'https://kuching.nonarkara.org',                     shot: SHOT.kuching },
  { code: 'MTT',       title: 'Muang Thong Thani',         url: 'https://mtt.nonarkara.org',                        shot: SHOT.desk },
  { code: 'CHULA',     title: 'Chula Control Tower',       url: 'https://chula.nonarkara.org/',                      shot: SHOT.control },
  { code: 'KMITL',     title: 'KMITL Control Tower',       url: 'https://kmitl-control-tower.pages.dev/',            shot: SHOT.control },
];

/** The number of cells, so the grid can be sized from the count and not the width. */
export const IOC_COUNT = IOC.length;

/**
 * The column count, chosen from the count.
 *
 * A grid whose columns do not divide its items strands the last one
 * alone beside empty cells — a hole, not a rhythm. 20 items: four columns
 * gives five full rows; five gives four. Four is the one that reads.
 */
export const IOC_COLUMNS = 4;
