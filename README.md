Rider Tracker Flutter App
A Flutter application that displays multiple riders' locations on a Google Map.

Setup Instructions
Install Flutter and set up your development environment
Clone this repository
Run flutter pub get to install dependencies
Replace YOUR_API_ENDPOINT in lib/main.dart with your actual API endpoint
Add your Google Maps API key to the Android and iOS configurations
Android Setup
Add your Google Maps API key to android/app/src/main/AndroidManifest.xml:

<manifest ...>
    <application ...>
        <meta-data
            android:name="com.google.android.geo.API_KEY"
            android:value="YOUR_API_KEY"/>
iOS Setup
Add your Google Maps API key to ios/Runner/AppDelegate.swift:

import UIKit
import Flutter
import GoogleMaps

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GMSServices.provideAPIKey("YOUR_API_KEY")
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
API Response Format
The API should return a JSON array of rider objects in the following format:

[
  {
    "id": "rider1",
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  {
    "id": "rider2",
    "latitude": 37.7833,
    "longitude": -122.4167
  }
]
Running the App
Run flutter run to start the application.
