<?php

namespace App\Account\Steam;

/** Checks a Steam Web API ticket with Steam and returns the player's SteamID64 (SAVE-113). */
interface SteamTickets
{
    /**
     * @throws SteamUnavailable when the server has no Steam key or Steam cannot be reached
     * @throws SteamRefused     when Steam does not accept the ticket
     */
    public function steamIdFor(string $ticket): string;
}
