* ✅ background should be random blurry photo
* ✅ fix setup to use new api abstraction
* ✅ merge pickfolderstore and setup store
* ✅ make global showError function that spawns a snackbar and logs it to console
* ✅ na register word je niet geredirect naar setup
* ✅ desync in ratios en photos
* ✅ main content is not taking up entire width
* ✅ search bar isn't centered
* ✅ er is ineens een transition als je de main page inlaad, de nav menu gaat van boven naar beneden
* ✅ WAAR IS DE TRANSITION
* ✅ maak virtual scroll met ratios.pb af
* ✅ probeer virtual scroll zonder alles van tevoren te laden
* ✅ probeer virtual scroll met ratios en v-virtual-scroll (we weten alle heights nu)
* ✅ border radius around every month grouping like i had before
* ✅ fix auth refresh token expire handling (is dit stuk?)
* ✅ ik kan nog een layout maken voor login/onboarding/register net zoals MainLayout.vue dat voor de main pages doet.
  Misschien
  met extra blurry etna BG
* ✅ if you quickly scroll/press next through viewphoto photos then it doesnt load full media item properly. Why? Also
  route seems to
  be wrong somehow. Doesnt match actual address in addressbalk
* ✅ in settings, add option to have solid color background, with fitting theme. or custom image as wallpaper with
  fitting theme.
* ✅ er klopt niks van de sync tussen scroll thumb en de year labels / month dots
* ✅ change scrollbar behaviour so dots and more scroll info is shown when scrolling
* ✅ you can't scroll to most recent photo with timeline scroll
* ✅ date overlay doesnt update if you click scroll to unloaded area in virtual scroller
* ✅ upper bound op tooltip
* ✅ fix scroll fps (is this possible?)
* ✅ volgens mij is fetchMediaByMonths shittylaggy als je hard scrollt
* ✅ on timeline, once loading of in view months in done, just loop until all months are loaded, starting with the ones
  near the viewed month
* ✅ don't push to history when next-ing trough photos in photoview
* ✅ refactor timeline into reusable photogrid
* ✅ support other sorting options for reusable timeline component
* ✅ support backend sort options
* ✅ vuetify discord vragen of het mogelijk is en nut heeft om alle item heights in een virtual scroll toe te voegen.
* ✅ make fetch months timelineStore function take ~0 ms on main thread.
* ✅ When processing image, link the image to a hash of the file + filename, so rebuilding is easy
* on login redirect to where you were
* standardize font sizes everywhere
* improve messaging when you load the website and the server is off
* make nav drawer collapsible, automatically make it small for smaller windows. Collapse to size of navbar in ruurd
  music
* [bug]: ratios.pb is refetched when you go from explore to photos, but the photos arent refreshed, so it can go
  out of sync (ratios & photos).
* make api.ts abstraction for protobuf endpoints.
* bad performance on firefox
* make func to refresh frontpage, call it after onboarding is done after 10s, then every 5s;
* view-option (like gmail), split view: if you single click a photo it opens in a right half of the window pane. Only
  works with enough screen width (desktop).
* implement frontend for share via registerProtocolHandler link
    * On login, Alice allows her website to register the protocol for photoshare://
    * bob wants to share album, generates share link: photos.bob.com/share?t=as8df89sad89asdf98, sends it to alice
        * as8df89sad89asdf98 contains bob's link, bob's username, and the secret token string.
    * alice opens link, finds public page on bobs frontend with a button to share the link: photoshare:
      as8df89sad89asdf98
    * alice's frontend automatically opens this and asks to import this album
* don't allow user to go to /onboarding if onboarding is done already.
* setting: usebackdropblur doesnt apply everywhere.
* preload 1440p thumbnail on grid item hover
* re-establish ws connection if auth failed and it's refreshed automatically afterwards
* stomme nav bar start te hoog en animeert naar beneden on page load
* add sort order to timeline controller and remove it as passed down prop, and use it in api requests through that prop
* volgende stap: selectie in photo grid laten maken
* ctrl z voor selecties?
* i need a selection overlay thing on photo grid
  * deselect all button
  * actions
  * can this integrate with date overlay?
* ga alle grote refs objects langs om te zien of een shallowref voordeel zou geven