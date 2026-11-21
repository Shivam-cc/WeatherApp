#[test]
#[ignore = "hits the network; run with `cargo test -- --ignored`"]
fn fetches_real_city() {
    let w = weather_core::fetch("Oslo").unwrap();
    assert_eq!((w.daily.len(), w.hourly.len()), (5, 48));
}
