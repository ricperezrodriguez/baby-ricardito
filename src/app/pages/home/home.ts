import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottleCard } from '@app/pages/home/cards/bottle-card';
import { BreastfeedingCard } from '@app/pages/home/cards/breastfeeding-card/breastfeeding-card';
import { DiaperCard } from '@app/pages/home/cards/diaper-card';
import { SleepCard } from '@app/pages/home/cards/sleep-card';

@Component({
  imports: [BreastfeedingCard, BottleCard, DiaperCard, SleepCard, RouterOutlet],
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {}
