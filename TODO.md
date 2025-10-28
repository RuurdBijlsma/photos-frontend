* ✅ background should be random blurry photo
* ✅ fix setup to use new api abstraction
* ✅ merge pickfolderstore and setup store
* ✅ make global showError function that spawns a snackbar and logs it to console
* ✅ na register word je niet geredirect naar setup
* ✅ desync in ratios en photos
* on login redirect to where you were
* standardize font sizes everywhere
* main content is not taking up entire width
* search bar isn't centered
* When processing image, link the image to a hash of the file + filename, so rebuilding is easy
* fix auth refresh token expire handling (is dit stuk?)
* improve messaging when you load the website and the server is off
* in settings, add option to have solid color background, with fitting theme. or custom image as wallpaper with fitting
  theme.
* make nav drawer collapsible, automatically make it small for smaller windows. Collapse to size of navbar in ruurd
  music
* er is ineens een transition als je de main page inlaad, de nav menu gaat van boven naar beneden
* WAAR IS DE TRANSITION
* maak virtual scroll met ratios.pb af
* probeer virtual scroll zonder alles van tevoren te laden
* probeer virtual scroll met ratios en v-virtual-scroll (we weten alle heights nu)
* vuetify discord vragen of het mogelijk is en nut heeft om alle item heights in een virtual scroll toe te voegen.
* possible bug: ratios.pb is refetched when you go from explore to photos, but the photos arent refreshed, so it can go
  out of sync (ratios & photos). Its better to just not refresh the ratios i think
* make fetch months photostore function take ~0 ms on main thread.
* make api.ts abstraction for protobuf endpoints.
* border radius around every month grouping like i had before
* bad performance on firefox
* make func to refresh frontpage, call it after setup is done after 10s, then every 5s;