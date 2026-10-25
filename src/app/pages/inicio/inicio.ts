import { Component } from '@angular/core';
import { BottleCard } from './cards/bottle-card';
import { BreastfeedingCard } from './cards/breastfeeding-card';
import { DiaperCard } from './cards/diaper-card';
import { SleepCard } from './cards/sleep-card';

@Component({
  imports: [BreastfeedingCard, BottleCard, DiaperCard, SleepCard],
  styleUrl: './inicio.scss',
  templateUrl: './inicio.html',
})
export class Inicio {}
