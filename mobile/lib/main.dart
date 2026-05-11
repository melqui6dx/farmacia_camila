import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';

import 'app.dart';
import 'core/config/app_config.dart';

export 'app.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  if (AppConfig.stripePublishableKey.trim().isNotEmpty) {
    Stripe.publishableKey = AppConfig.stripePublishableKey.trim();
  }

  runApp(const PharmacyClientApp());
}
